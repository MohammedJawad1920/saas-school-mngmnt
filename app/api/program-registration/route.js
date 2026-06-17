// app/api/program-registration/route.js - OPTIMIZED VERSION
import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import ProgramRegistration from "@/models/ProgramRegistration";
import Program from "@/models/Program";
import Participant from "@/models/Participant";
import Team from "@/models/Team";
import mongoose from "mongoose";
import { getYear } from "@/lib/getYear";

// Helpers
const toId = (v) =>
  typeof v === "string" ? v : (v?.toString?.() ?? String(v));
const sameId = (a, b) => toId(a) === toId(b);

// Helper function to add program to participant without duplicates
const addProgramToParticipants = async (participantIds, programId) => {
  for (const participantId of participantIds) {
    // First, remove any existing entry for this program
    await Participant.updateOne(
      { _id: participantId },
      { $pull: { programs: { id: programId } } }
    );

    // Then add the new entry
    await Participant.updateOne(
      { _id: participantId },
      {
        $push: {
          programs: {
            id: programId,
            rank: 0,
            grade: "",
            points: 0,
          },
        },
      }
    );
  }
};

// ----------------------------- OPTIMIZED GET -----------------------------
export async function GET(request) {
  try {
    await connectToDB();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 0;
    const limit = parseInt(searchParams.get("limit")) || 50; // Reduced default limit
    const skip = page * limit;

    const programId = searchParams.get("programId");
    const teamId = searchParams.get("teamId");
    const status = searchParams.get("status");
    const divisionId = searchParams.get("divisionId");
    const isCodeLetter = searchParams.get("isCodeLetter") === "true";
    const isResultDeclared = searchParams.get("isResultDeclared");

    // Build optimized aggregation pipeline with early filtering
    let pipeline = [
      // EARLY FILTERING - Most restrictive filters first
      {
        $match: {
          year: await getYear(request),
          ...(programId && {
            programId: new mongoose.Types.ObjectId(programId),
          }),
          ...(teamId && {
            teamId: teamId,
          }),
          ...(isResultDeclared !== null && {
            isResultDeclared: isResultDeclared === "true",
          }),

          // Code letter filtering - early exit if no code letters
          ...(isCodeLetter && {
            participants: {
              $elemMatch: {
                codeLetter: { $exists: true, $ne: "", $ne: null },
              },
            },
          }),

          // Status filtering with indexed field
          ...(status === "Evaluated" && {
            "participants.totalMarks": { $gt: 0 },
          }),
          ...(status === "Registered" && {
            $nor: [{ "participants.totalMarks": { $gt: 0 } }],
          }),
        },
      },

      // Single optimized lookup with nested population
      {
        $lookup: {
          from: "programs",
          let: { programId: "$programId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$programId"] } } },
            {
              $lookup: {
                from: "divisions",
                localField: "divisionId",
                foreignField: "_id",
                as: "division",
              },
            },
            {
              $unwind: { path: "$division", preserveNullAndEmptyArrays: true },
            },
            {
              $project: {
                name: 1,
                type: 1,
                category: 1,
                maxParticipants: 1,
                divisionId: 1,
                division: 1,
              },
            },
          ],
          as: "program",
        },
      },
      { $unwind: "$program" },

      // Division filtering after lookup but before team/participant lookup
      ...(divisionId
        ? [
            {
              $match: {
                "program.division._id": divisionId,
              },
            },
          ]
        : []),

      // Optimized team lookup
      {
        $lookup: {
          from: "teams",
          localField: "teamId",
          foreignField: "_id",
          as: "team",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },

      // Optimized participant lookup - only get needed fields
      {
        $lookup: {
          from: "participants",
          let: { participantIds: "$participants.id" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$participantIds"] } } },
            { $project: { name: 1, chestNumber: 1, age: 1 } },
          ],
          as: "participantDetails",
        },
      },

      // Project only needed fields to reduce data transfer
      {
        $project: {
          programId: "$program._id",
          programName: "$program.name",
          programType: "$program.type",
          programCategory: "$program.category",
          maxParticipants: "$program.maxParticipants",
          divisionId: "$program.division._id",
          divisionName: "$program.division.name",
          teamId: "$team._id",
          teamName: "$team.name",
          participants: 1,
          participantDetails: 1,
          status: 1,
          isResultDeclared: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },

      // Sort early to enable index usage
      { $sort: { programName: 1, "team.name": 1 } },
    ];

    // Get total count efficiently
    const countPipeline = [...pipeline, { $count: "total" }];

    const [countResult, results] = await Promise.all([
      ProgramRegistration.aggregate(countPipeline),
      ProgramRegistration.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: limit },
      ]),
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Optimized data transformation with Map for O(1) lookups
    const transformedData = results.map((reg, index) => {
      // Create participant lookup map once
      const participantMap = new Map();
      (reg.participantDetails || []).forEach((p) => {
        participantMap.set(p._id.toString(), p);
      });

      // Filter participants if needed
      const participants = isCodeLetter
        ? (reg.participants || []).filter(
            (p) => p.codeLetter && p.codeLetter.trim() !== ""
          )
        : reg.participants || [];

      // Build participant details efficiently
      const participantsDetails = participants.map((p) => {
        const participant = participantMap.get(p.id?.toString() || p.id) || {};
        return {
          id: participant._id,
          name: participant.name || "Unknown",
          chestNumber: participant.chestNumber,
          totalMarks: p.totalMarks || 0,
          codeLetter: p.codeLetter || "",
          marksByJudges: p.marksByJudges || [],
        };
      });

      const participantNames = participantsDetails.map((p) => {
        return p.chestNumber ? `${p.chestNumber} - ${p.name}` : p.name;
      });

      return {
        _id: reg._id,
        serialNo: skip + index + 1,
        programId: reg.programId,
        programName: reg.programName,
        programType: reg.programType,
        programCategory: reg.programCategory,
        maxParticipants: reg.maxParticipants,
        divisionId: reg.divisionId,
        divisionName: reg.divisionName,
        teamId: reg.teamId,
        teamName: reg.teamName || "N/A",
        participants: participants.map((p) => p.id?.toString() || p.id),
        participantsDetails,
        participantsCount: participants.length,
        participantNames,
        status: participantsDetails.some((p) => p.totalMarks > 0)
          ? "Evaluated"
          : "Registered",
        isResultDeclared: reg.isResultDeclared,
        createdAt: reg.createdAt,
        updatedAt: reg.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      registrations: transformedData,
      pagination: {
        page,
        totalPages: Math.ceil(total / limit) || 1,
        total,
        hasNextPage: skip + limit < total,
        hasPrevPage: page > 0,
      },
    });
  } catch (error) {
    console.error("Error fetching program registrations:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch program registrations" },
      { status: 500 }
    );
  }
}

// ----------------------------- POST -----------------------------
export async function POST(request) {
  try {
    await connectToDB();
    const body = await request.json();
    const { programId, participants, userId, activeRole } = body;

    if (
      !programId ||
      !Array.isArray(participants) ||
      participants.length === 0
    ) {
      return NextResponse.json(
        { success: false, message: "Program ID and participants are required" },
        { status: 400 }
      );
    }

    // Fetch program with division in single query
    const program = await Program.findById(programId).populate("divisionId");
    if (!program) {
      return NextResponse.json(
        { success: false, message: "Program not found" },
        { status: 404 }
      );
    }

    const division = program.divisionId;
    if (!division) {
      return NextResponse.json(
        { success: false, message: "Division not found" },
        { status: 404 }
      );
    }

    // Fetch participants with their teamId and divisionId
    const participantDocs = await Participant.find({
      _id: { $in: participants },
    }).populate("divisionId");

    if (participantDocs.length !== participants.length) {
      return NextResponse.json(
        { success: false, message: "Some participants not found" },
        { status: 404 }
      );
    }

    // If Program Leader — check team ownership
    let allowedTeamIds = [];
    if (activeRole === "Program Leader") {
      const leaderTeams = await Team.find({ leaderId: userId }).select("_id");
      allowedTeamIds = leaderTeams.map((t) => t._id.toString());
      const invalid = participantDocs.filter(
        (p) => !allowedTeamIds.includes(p.teamId.toString())
      );
      if (invalid.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "You can only register participants from your own teams",
          },
          { status: 403 }
        );
      }
    }

    // Group participants by teamId from DB
    const grouped = {};
    participantDocs.forEach((p) => {
      const tid = p.teamId.toString();
      if (!grouped[tid]) grouped[tid] = [];
      grouped[tid].push(p._id.toString());
    });

    const createdRegs = [];
    for (const [teamId, teamParticipants] of Object.entries(grouped)) {
      // Capacity checks
      if (teamParticipants.length > program.maxParticipants) {
        return NextResponse.json(
          {
            success: false,
            message: `Maximum ${program.maxParticipants} participants allowed for this program`,
          },
          { status: 400 }
        );
      }

      // Prevent duplicate registration for team
      const exists = await ProgramRegistration.findOne({ programId, teamId });
      if (exists) {
        return NextResponse.json(
          {
            success: false,
            message: `Team already registered for this program`,
          },
          { status: 400 }
        );
      }

      // For Primary divisions, check individual stage/off-stage event limits
      if (division.type === "Primary" && program.type === "Individual") {
        // Batch query for all participants' current registrations
        const currentRegistrations = await ProgramRegistration.find({
          "participants.id": { $in: teamParticipants },
        }).populate({
          path: "programId",
          select: "category type",
        });

        for (const participantId of teamParticipants) {
          const participantRegistrations = currentRegistrations.filter((reg) =>
            reg.participants.some((p) => p.id.toString() === participantId)
          );

          const currentCategoryCount = participantRegistrations.filter(
            (reg) =>
              reg.programId.category === program.category &&
              reg.programId.type === "Individual"
          ).length;

          let maxAllowed;
          if (program.category === "Stage") {
            maxAllowed = division.stageEvents || 0;
          } else if (program.category === "Off-Stage") {
            maxAllowed = division.offStageEvents || 0;
          }

          if (maxAllowed > 0 && currentCategoryCount >= maxAllowed) {
            const participant = participantDocs.find(
              (p) => p._id.toString() === participantId
            );
            return NextResponse.json(
              {
                success: false,
                message: `Participant ${participant?.name} has reached maximum limit of ${maxAllowed} individual ${program.category.toLowerCase()} events`,
              },
              { status: 400 }
            );
          }
        }
      }

      // Create registration for this team
      const participantData = teamParticipants.map((id) => ({
        id,
        codeLetter: "",
        marksByJudges: [],
        totalMarks: 0,
      }));

      const activeYear = await getYear(request);
      const reg = await ProgramRegistration.create({
        programId,
        teamId,
        participants: participantData,
        year: activeYear,
      });
      createdRegs.push(reg);

      // Add program to participants (preventing duplicates)
      await addProgramToParticipants(teamParticipants, programId);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Program registrations created successfully",
        data: createdRegs,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating program registration:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create program registration" },
      { status: 500 }
    );
  }
}

// ----------------------------- PUT -----------------------------
export async function PUT(request) {
  try {
    await connectToDB();
    const body = await request.json();
    const { ids, participants, userId, activeRole } = body;

    const id = Array.isArray(ids) ? ids[0] : ids;

    if (!id || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Registration ID and participants are required",
        },
        { status: 400 }
      );
    }

    const existingReg =
      await ProgramRegistration.findById(id).populate("programId");
    if (!existingReg) {
      return NextResponse.json(
        { success: false, message: "Registration not found" },
        { status: 404 }
      );
    }

    const program = await Program.findById(existingReg.programId).populate(
      "divisionId"
    );
    const division = program.divisionId;

    // Fetch participants with team info
    const participantDocs = await Participant.find({
      _id: { $in: participants },
    }).populate("divisionId");

    if (participantDocs.length !== participants.length) {
      return NextResponse.json(
        { success: false, message: "Some participants not found" },
        { status: 404 }
      );
    }

    // If leader, verify teams
    let allowedTeamIds = [];
    if (activeRole === "Program Leader") {
      const leaderTeams = await Team.find({ leaderId: userId }).select("_id");
      allowedTeamIds = leaderTeams.map((t) => t._id.toString());
      const invalid = participantDocs.filter(
        (p) => !allowedTeamIds.includes(p.teamId.toString())
      );
      if (invalid.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "You can only update your own team's registrations",
          },
          { status: 403 }
        );
      }
    }

    // Group participants by teamId
    const grouped = {};
    participantDocs.forEach((p) => {
      const tid = p.teamId.toString();
      if (!grouped[tid]) grouped[tid] = [];
      grouped[tid].push(p._id.toString());
    });

    const updatedRegs = [];

    for (const [teamId, teamParticipants] of Object.entries(grouped)) {
      if (teamParticipants.length > program.maxParticipants) {
        return NextResponse.json(
          {
            success: false,
            message: `Maximum ${program.maxParticipants} participants allowed for this program`,
          },
          { status: 400 }
        );
      }

      if (division.type === "Primary" && program.type === "Individual") {
        // Batch query for current registrations
        const currentRegistrations = await ProgramRegistration.find({
          _id: { $ne: id },
          "participants.id": { $in: teamParticipants },
        }).populate({
          path: "programId",
          select: "category type",
        });

        for (const participantId of teamParticipants) {
          const participantRegistrations = currentRegistrations.filter((reg) =>
            reg.participants.some((p) => p.id.toString() === participantId)
          );

          const currentCategoryCount = participantRegistrations.filter(
            (reg) =>
              reg.programId.category === program.category &&
              reg.programId.type === "Individual"
          ).length;

          let maxAllowed;
          if (program.category === "Stage") {
            maxAllowed = division.stageEvents || 0;
          } else if (program.category === "Off-Stage") {
            maxAllowed = division.offStageEvents || 0;
          }

          if (maxAllowed > 0 && currentCategoryCount >= maxAllowed) {
            const participant = participantDocs.find(
              (p) => p._id.toString() === participantId
            );
            return NextResponse.json(
              {
                success: false,
                message: `Participant ${participant?.name} has reached maximum limit of ${maxAllowed} individual ${program.category.toLowerCase()} events`,
              },
              { status: 400 }
            );
          }
        }
      }

      const reg = await ProgramRegistration.findOne({
        programId: program._id,
        teamId,
      });

      if (reg) {
        // Update existing reg
        reg.participants = teamParticipants.map((id) => ({
          id,
          codeLetter: "",
          marksByJudges: [],
          totalMarks: 0,
        }));
        await reg.save();
        updatedRegs.push(reg);
      } else {
        // Create new reg for this team
        const newReg = await ProgramRegistration.create({
          programId: program._id,
          teamId,
          participants: teamParticipants.map((id) => ({
            id,
            codeLetter: "",
            marksByJudges: [],
            totalMarks: 0,
          })),
        });
        updatedRegs.push(newReg);
      }

      // Update participant program lists (preventing duplicates)
      await addProgramToParticipants(teamParticipants, program._id);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Program registrations updated successfully",
        data: updatedRegs,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating program registration:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update program registration" },
      { status: 500 }
    );
  }
}

// ----------------------------- DELETE -----------------------------
export async function DELETE(request) {
  try {
    await connectToDB();

    const body = await request.json();
    const { ids, userId, activeRole } = body;

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "Registration ID(s) are required" },
        { status: 400 }
      );
    }

    if (activeRole === "Program Leader") {
      const leaderTeam = await Team.findOne({ leaderId: userId });
      if (!leaderTeam) {
        return NextResponse.json(
          { success: false, message: "Team not found for this program leader" },
          { status: 404 }
        );
      }

      const regs = await ProgramRegistration.find({ _id: { $in: ids } });
      const unauthorized = regs.filter(
        (reg) => !sameId(reg.teamId, leaderTeam._id)
      );
      if (unauthorized.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "You can only delete your team's registrations",
          },
          { status: 403 }
        );
      }
    }

    const regsWithMarks = await ProgramRegistration.find({
      _id: { $in: ids },
      "participants.totalMarks": { $gt: 0 },
    });
    if (regsWithMarks.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot delete registrations that have marks assigned",
        },
        { status: 400 }
      );
    }

    // Capture participant-program pairs so we can clean up participants.programs later
    const regsToDelete = await ProgramRegistration.find({
      _id: { $in: ids },
    }).select("participants programId");

    const pairs = [];
    regsToDelete.forEach((reg) => {
      reg.participants.forEach((p) => {
        pairs.push({
          participantId: toId(p.id),
          programId: toId(reg.programId),
        });
      });
    });

    const result = await ProgramRegistration.deleteMany({ _id: { $in: ids } });

    // Batch update participant program lists
    const participantUpdates = {};
    pairs.forEach((pair) => {
      if (!participantUpdates[pair.participantId]) {
        participantUpdates[pair.participantId] = [];
      }
      participantUpdates[pair.participantId].push(pair.programId);
    });

    // Remove program references from participants in batch
    const participantUpdatePromises = Object.entries(participantUpdates).map(
      ([participantId, programIds]) =>
        Participant.updateOne(
          { _id: participantId },
          { $pull: { programs: { id: { $in: programIds } } } }
        )
    );
    await Promise.all(participantUpdatePromises);

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} registration(s) deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error deleting program registrations:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete program registrations" },
      { status: 500 }
    );
  }
}
