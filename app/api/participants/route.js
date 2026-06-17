import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Participant from "@/models/Participant";
import Division from "@/models/Division";
import User from "@/models/User";
import Team from "@/models/Team";
import ProgramRegistration from "@/models/ProgramRegistration";
import Result from "@/models/Result";
import { getYear } from "@/lib/getYear";

export async function assignChestNumbers(divisionId, participantCount) {
  try {
    // Get division details including range
    const division = await Division.findById(divisionId);
    if (!division || !division.chestNumberRange) {
      throw new Error("Division or chest number range not found");
    }

    const { from, to } = division.chestNumberRange;
    const rangeSize = to - from + 1;

    // Validate available numbers
    if (participantCount > rangeSize) {
      throw new Error(
        `Not enough chest numbers available. Range: ${from}-${to} (${rangeSize} numbers), Requested: ${participantCount}`
      );
    }

    // Fetch all existing participants in this division
    const existingParticipants = await Participant.find(
      { divisionId },
      { chestNumber: 1, createdAt: 1 }
    ).sort({ createdAt: 1 });

    // Track all taken numbers
    const usedChestNumbers = new Set(
      existingParticipants
        .filter((p) => p.chestNumber !== null && p.chestNumber !== undefined)
        .map((p) => p.chestNumber)
    );

    // Find participants without chest numbers (sorted by createdAt)
    const unassignedParticipants = existingParticipants.filter(
      (p) => !p.chestNumber
    );

    // Assign chest numbers in createdAt order
    const assignedNumbers = [];
    let current = from;

    for (const participant of unassignedParticipants) {
      // Find the next available number
      while (usedChestNumbers.has(current)) {
        current++;
        if (current > to) {
          throw new Error(
            `Ran out of chest numbers in range ${from}-${to} while assigning`
          );
        }
      }

      // Assign chest number
      participant.chestNumber = current;
      usedChestNumbers.add(current);
      assignedNumbers.push(current);

      // Save participant
      await participant.save();

      // Move to next number
      current++;
    }

    return assignedNumbers;
  } catch (error) {
    console.error("Error assigning chest numbers:", error);
    throw error;
  }
}

export async function GET(req, res) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "page" && key !== "limit" && key !== "projection") {
        filterParams[key] = value;
      }
    }

    // Get projection param
    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1;
      });
    }

    const sortByPoints = filterParams.sortByPoints === "true";

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams?._id) {
      query._id = filterParams._id;
    }
    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }
    if (filterParams.batchId) {
      query.batchId = filterParams.batchId;
    }
    if (filterParams.teamId) {
      query.teamId = filterParams.teamId;
    }
    if (filterParams.divisionId) {
      query.divisionId = filterParams.divisionId;
    }
    if (filterParams.chestNumber) {
      query.chestNumber = parseInt(filterParams.chestNumber);
    }

    // Add year to query
    const activeYear = await getYear(req);
    query.year = activeYear;

    // Handle non-responders filter at database level
    if (filterParams.nonResponders === "true") {
      // Use aggregation pipeline to filter non-responders
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $lookup: {
            from: "batches",
            localField: "batchId",
            foreignField: "_id",
            as: "batchDetails",
          },
        },
        {
          $lookup: {
            from: "teams",
            localField: "teamId",
            foreignField: "_id",
            as: "teamDetails",
          },
        },
        {
          $lookup: {
            from: "divisions",
            localField: "divisionId",
            foreignField: "_id",
            as: "divisionDetails",
          },
        },
        {
          $lookup: {
            from: "programregistrations",
            let: { participantId: { $toString: "$_id" } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ["$$participantId", "$participants.id"],
                  },
                },
              },
              { $unwind: "$participants" },
              {
                $match: {
                  $expr: { $eq: ["$participants.id", "$$participantId"] },
                },
              },
              {
                $match: {
                  $or: [
                    { "participants.codeLetter": { $exists: false } },
                    { "participants.codeLetter": null },
                    { "participants.codeLetter": "" },
                  ],
                },
              },
              {
                $lookup: {
                  from: "programs",
                  localField: "programId",
                  foreignField: "_id",
                  as: "programDetails",
                },
              },
              {
                $project: {
                  programId: 1,
                  programName: { $arrayElemAt: ["$programDetails.name", 0] },
                  programCategory: {
                    $arrayElemAt: ["$programDetails.category", 0],
                  },
                  programType: { $arrayElemAt: ["$programDetails.type", 0] },
                },
              },
            ],
            as: "nonResponsePrograms",
          },
        },
        // Filter only participants who have non-response programs
        {
          $match: {
            "nonResponsePrograms.0": { $exists: true },
          },
        },
        // Get total count for pagination
        {
          $facet: {
            data: [
              { $skip: page * limit },
              { $limit: limit },
              { $sort: { chestNumber: 1 } },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ];

      const [result] = await Participant.aggregate(pipeline);
      const participants = result.data || [];
      const totalCount = result.totalCount[0]?.count || 0;

      // Format the participants data
      const formattedParticipants = participants.map((participant) => ({
        ...participant,
        _id: participant._id,
        profilePic: participant.userDetails[0]?.profilePic,
        batchId: participant.batchDetails[0]?._id,
        batchName: participant.batchDetails[0]?.name || "Unknown",
        teamId: participant.teamDetails[0]?._id,
        teamName: participant.teamDetails[0]?.name || "Unknown",
        divisionId: participant.divisionDetails[0]?._id,
        divisionName: participant.divisionDetails[0]?.name || "Unknown",
        programsCount: participant.programs?.length || 0,
        stageProgramsCount:
          participant.programs?.filter((p) => p.category === "Stage")?.length ||
          0,
        offStageProgramsCount:
          participant.programs?.filter((p) => p.category === "Off-Stage")
            ?.length || 0,
        totalPoints:
          (participant.stagePoints || 0) + (participant.offStagePoints || 0),
        nonResponseProgramsNames:
          participant.nonResponsePrograms?.map((p) => p.programName) || [],
        totalNonResponsePrograms: participant.nonResponsePrograms?.length || 0,
      }));

      return NextResponse.json(
        {
          participants: formattedParticipants,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages:
              limit === Infinity
                ? 1
                : Math.max(0, Math.ceil(totalCount / limit)),
          },
          message: "Non-responder participants fetched successfully!",
        },
        { status: 200 }
      );
    }

    // Handle non-winners filter at database level
    if (filterParams.nonWinners === "true") {
      // Use aggregation pipeline to filter non-winners
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $lookup: {
            from: "batches",
            localField: "batchId",
            foreignField: "_id",
            as: "batchDetails",
          },
        },
        {
          $lookup: {
            from: "teams",
            localField: "teamId",
            foreignField: "_id",
            as: "teamDetails",
          },
        },
        {
          $lookup: {
            from: "divisions",
            localField: "divisionId",
            foreignField: "_id",
            as: "divisionDetails",
          },
        },
        {
          $lookup: {
            from: "programregistrations",
            localField: "_id",
            foreignField: "participants.id",
            as: "programRegistrations",
          },
        },
        // Add a field to check if participant has any winning rank (1-3)
        {
          $addFields: {
            hasWinningRank: {
              $anyElementTrue: {
                $map: {
                  input: "$programs",
                  as: "program",
                  in: {
                    $and: [
                      { $gt: ["$$program.rank", 0] },
                      { $lt: ["$$program.rank", 4] },
                    ],
                  },
                },
              },
            },
          },
        },
        // Filter only non-winners
        { $match: { hasWinningRank: { $ne: true } } },
        // Get total count for pagination
        {
          $facet: {
            data: [
              { $skip: page * limit },
              { $limit: limit },
              { $sort: { chestNumber: 1 } },
            ],
            totalCount: [{ $count: "count" }],
          },
        },
      ];

      const [result] = await Participant.aggregate(pipeline);
      const participants = result.data || [];
      const totalCount = result.totalCount[0]?.count || 0;

      // Format the participants data
      const formattedParticipants = participants.map((participant) => ({
        ...participant,
        _id: participant._id,
        profilePic: participant.userDetails[0]?.profilePic,
        batchId: participant.batchDetails[0]?._id,
        batchName: participant.batchDetails[0]?.name || "Unknown",
        teamId: participant.teamDetails[0]?._id,
        teamName: participant.teamDetails[0]?.name || "Unknown",
        divisionId: participant.divisionDetails[0]?._id,
        divisionName: participant.divisionDetails[0]?.name || "Unknown",
        programsCount: participant.programs?.length || 0,
        stageProgramsCount:
          participant.programs?.filter((p) => p.category === "Stage")?.length ||
          0,
        offStageProgramsCount:
          participant.programs?.filter((p) => p.category === "Off-Stage")
            ?.length || 0,
        totalPoints:
          (participant.stagePoints || 0) + (participant.offStagePoints || 0),
      }));

      return NextResponse.json(
        {
          participants: formattedParticipants,
          pagination: {
            page,
            limit,
            total: totalCount,
            totalPages:
              limit === Infinity
                ? 1
                : Math.max(0, Math.ceil(totalCount / limit)),
          },
          message: "Non-winner participants fetched successfully!",
        },
        { status: 200 }
      );
    }

    // Determine sort criteria
    let sortCriteria = { chestNumber: 1 }; // default sort

    if (sortByPoints) {
      // Sort by total points (descending), then by chest number (ascending)
      sortCriteria = [
        {
          $addFields: {
            totalPoints: {
              $add: [
                { $ifNull: ["$stagePoints", 0] },
                { $ifNull: ["$offStagePoints", 0] },
              ],
            },
          },
        },
        { $sort: { totalPoints: -1, chestNumber: 1 } },
      ];
    }

    // If sortByPoints is true, use aggregation pipeline
    if (sortByPoints) {
      const pipeline = [
        { $match: query },
        ...sortCriteria,
        { $skip: page * limit },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "userDetails",
          },
        },
        {
          $lookup: {
            from: "batches",
            localField: "batchId",
            foreignField: "_id",
            as: "batchDetails",
          },
        },
        {
          $lookup: {
            from: "teams",
            localField: "teamId",
            foreignField: "_id",
            as: "teamDetails",
          },
        },
        {
          $lookup: {
            from: "divisions",
            localField: "divisionId",
            foreignField: "_id",
            as: "divisionDetails",
          },
        },
      ];

      // Get total count
      const totalPipeline = [{ $match: query }, { $count: "total" }];

      const [participants, totalResult] = await Promise.all([
        Participant.aggregate(pipeline),
        Participant.aggregate(totalPipeline),
      ]);

      const total = totalResult[0]?.total || 0;

      // Format participants data
      const formattedParticipants = participants.map((participant) => ({
        ...participant,
        _id: participant._id,
        profilePic: participant.userDetails[0]?.profilePic,
        batchId: participant.batchDetails[0]?._id,
        batchName: participant.batchDetails[0]?.name || "Unknown",
        teamId: participant.teamDetails[0]?._id,
        teamName: participant.teamDetails[0]?.name || "Unknown",
        divisionId: participant.divisionDetails[0]?._id,
        divisionName: participant.divisionDetails[0]?.name || "Unknown",
        programsCount: participant.programs?.length || 0,
        stageProgramsCount:
          participant.programs?.filter((p) => p.category === "Stage")?.length ||
          0,
        offStageProgramsCount:
          participant.programs?.filter((p) => p.category === "Off-Stage")
            ?.length || 0,
        totalPoints: participant.totalPoints || 0,
      }));

      return NextResponse.json(
        {
          participants: formattedParticipants,
          pagination: {
            page,
            limit,
            total,
            totalPages:
              limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
          },
          message: "Participants fetched successfully (sorted by points)!",
        },
        { status: 200 }
      );
    }

    // Regular participant fetching (non-filtered, non-sorted by points)
    const participants = await Participant.find(query, projections)
      .populate("batchId", ["_id", "name"])
      .populate("teamId", ["_id", "name"])
      .populate("divisionId", ["_id", "name"])
      .populate({
        path: "programs",
        populate: {
          path: "id",
          select: ["_id", "name", "category", "type", "divisionId"],
          populate: {
            path: "divisionId",
            select: ["_id", "name", "type"],
          },
        },
      })
      .skip(page * limit)
      .limit(limit)
      .sort(sortCriteria)
      .collation({ locale: "en_US", numericOrdering: true });

    // Fetch profile pics for participants (participant._id is "userId-year")
    const userIds = participants.map((p) => String(p._id).split("-")[0]).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }, "profilePic").lean();
    const profilePicMap = {};
    users.forEach((u) => { profilePicMap[String(u._id)] = u.profilePic?.url || null; });

    const total = await Participant.countDocuments(query);

    console.log(filterParams);

    const formattedParticipants = participants.map((participant) => {
      const userId = String(participant._id).split("-")[0];
      return {
      ...participant.toObject(),
      _id: participant._id,
      profilePic: profilePicMap[userId] || null,
      batchId: participant.batchId?._id,
      batchName: participant.batchId?.name || "Unknown",
      teamId: participant.teamId?._id,
      teamName: participant.teamId?.name || "Unknown",
      divisionId: participant.divisionId?._id,
      divisionName: participant.divisionId?.name || "Unknown",
      programsCount: participant.programs?.length || 0,
      stageProgramsCount:
        participant.programs?.filter((p) => p.id.category === "Stage")
          ?.length || 0,
      offStageProgramsCount:
        participant.programs?.filter((p) => p.id.category === "Off-Stage")
          ?.length || 0,
      totalPoints:
        (participant.stagePoints || 0) + (participant.offStagePoints || 0),
      programs: participant.programs.map((program) => ({
        ...program.toObject(),
        id: program?.id?._id,
        name: program?.id?.name,
        type: program?.id?.type,
        category: program?.id?.category,
        divisionId: program?.id?.divisionId?._id,
        divisionType: program?.id?.divisionId?.type,
      })),
    };
    });

    return NextResponse.json(
      {
        participants: formattedParticipants,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Participants fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching participants:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    const {
      participantIds,
      batchId,
      teamId,
      divisionId,
      stagePoints = 0,
      offStagePoints = 0,
    } = data;

    // Validate required fields
    if (
      !participantIds ||
      !Array.isArray(participantIds) ||
      participantIds.length === 0
    ) {
      return NextResponse.json(
        { message: "At least one participant must be selected" },
        { status: 400 }
      );
    }

    if (!teamId || !divisionId) {
      return NextResponse.json(
        { message: " Team, and Division are required" },
        { status: 400 }
      );
    }

    // Get user details for the selected participant IDs
    const users = await User.find({ _id: { $in: participantIds } });
    if (users.length !== participantIds.length) {
      return NextResponse.json(
        { message: "Some selected users were not found" },
        { status: 400 }
      );
    }

    // Check if any participants already exist
    const activeYear = await getYear(req);
    const participantIdsWithYear = participantIds.map(id => `${id}-${activeYear}`);

    const existingParticipants = await Participant.find({
      _id: { $in: participantIdsWithYear },
    });
    if (existingParticipants.length > 0) {
      const existingIds = existingParticipants.map((p) => p._id);

      return NextResponse.json(
        { message: `Participants already exist for this year: ${existingIds.join(", ")}` },
        { status: 400 }
      );
    }

    // Assign chest numbers for the new participants
    let assignedChestNumbers;
    try {
      assignedChestNumbers = await assignChestNumbers(
        divisionId,
        participantIds.length
      );
    } catch (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    // Create participant documents with assigned chest numbers
    const participantsToCreate = users.map((user, index) => ({
      _id: `${user._id}-${activeYear}`,
      name: user.name,
      batchId,
      teamId,
      divisionId,
      chestNumber: assignedChestNumbers[index],
      stagePoints,
      offStagePoints,
      programs: [],
      year: activeYear,
    }));

    // Create all participants first
    const participants = await Participant.insertMany(participantsToCreate);

    const participantIdsCreated = participants.map((p) => String(p._id));

    await Promise.all([
      Division.updateOne(
        { _id: divisionId },
        { $addToSet: { participantsId: { $each: participantIdsCreated } } }
      ),
      Team.updateOne(
        { _id: teamId },
        { $addToSet: { membersId: { $each: participantIdsCreated } } }
      ),
    ]);

    return NextResponse.json(
      {
        message: `${participants.length} participant(s) created successfully! All chest numbers have been updated.`,
        participants,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();
    const data = await req.json();
    const { ids } = data;

    if (!ids || ids.length === 0) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const participantId = ids[0];
    const updateData = { ...data };
    delete updateData.ids;
    delete updateData._id;

    // Get the existing participant
    const participant = await Participant.findById(participantId);
    if (!participant) {
      return NextResponse.json(
        { message: "Participant not found" },
        { status: 404 }
      );
    }

    const oldDivisionId = participant.divisionId.toString();
    const oldTeamId = participant.teamId.toString();

    // Update the participant
    const updatedParticipant = await Participant.findOneAndUpdate(
      { _id: participantId },
      { $set: updateData },
      { new: true }
    );

    // If division changed
    if (updateData.divisionId && updateData.divisionId !== oldDivisionId) {
      await Promise.all([
        Division.updateOne(
          { _id: oldDivisionId },
          { $pull: { participantsId: participantId } }
        ),
        Division.updateOne(
          { _id: updateData.divisionId },
          { $addToSet: { participantsId: participantId } }
        ),
        ProgramRegistration.updateMany(
          { "participants.id": participantId },
          { $pull: { participants: { id: participantId } } }
        ),
        Result.updateMany(
          { "participants.id": participantId },
          { $pull: { participants: { id: participantId } } }
        ),
      ]);
    }

    // If team changed
    if (updateData.teamId && updateData.teamId !== oldTeamId) {
      await Promise.all([
        Team.updateOne(
          { _id: oldTeamId },
          { $pull: { membersId: participantId } }
        ),
        Team.updateOne(
          { _id: updateData.teamId },
          { $addToSet: { membersId: participantId } }
        ),
      ]);
    }

    return NextResponse.json(
      {
        message: "Participant updated successfully!",
        participant: updatedParticipant,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    const { ids } = data;

    if (!ids || ids.length === 0) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    // Get the division IDs of participants being deleted to reassign chest numbers later
    const participantsToDelete = await Participant.find({
      _id: { $in: ids },
    }).select("divisionId");
    const affectedDivisionIds = [
      ...new Set(participantsToDelete.map((p) => p.divisionId.toString())),
    ];

    // Delete participants
    const deletedParticipants = await Participant.deleteMany({
      _id: { $in: ids },
    });

    await Promise.all([
      Division.updateMany(
        { participantsId: { $in: ids } },
        { $pull: { participantsId: { $in: ids } } }
      ),
      Team.updateMany(
        { membersId: { $in: ids } },
        { $pull: { membersId: { $in: ids } } }
      ),
      ProgramRegistration.updateMany(
        { "participants.id": { $in: ids } },
        { $pull: { participants: { id: { $in: ids } } } }
      ),
      Result.updateMany(
        { "participants.id": { $in: ids } },
        { $pull: { participants: { id: { $in: ids } } } }
      ),
    ]);

    if (deletedParticipants.deletedCount === 0) {
      return NextResponse.json(
        { message: "No participants found to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: `${deletedParticipants.deletedCount} participant(s) deleted successfully! Chest numbers have been updated.`,
        deletedParticipants,
        affectedDivisions: affectedDivisionIds.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
