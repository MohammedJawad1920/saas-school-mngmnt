import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import LiteraryGroup from "@/models/LiteraryGroup";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination parameters
      if (key !== "page" && key !== "limit" && key !== "projection") {
        filterParams[key] = value;
      }
    }

    // Get projection param
    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    // Convert projection param to MongoDB projection object
    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1; // Include each field
      });
    }

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams?._id) {
      query._id = filterParams?._id;
    }
    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }

    // Execute query with pagination
    const groups = await LiteraryGroup.find(query, projections)
      .populate({
        path: "studentsId",
        select: ["_id", "name", "profilePic", "studentSpecificField"],
        populate: {
          path: "studentSpecificField.classId",
          select: ["_id", "name"],
        },
      })
      .populate({
        path: "leaderId",
        select: ["_id", "name", "profilePic", "studentSpecificField"],
        populate: {
          path: "studentSpecificField.classId",
          select: ["_id", "name"],
        },
      })
      .populate({
        path: "assistantLeaderId",
        select: ["_id", "name", "profilePic", "studentSpecificField"],
        populate: {
          path: "studentSpecificField.classId",
          select: ["_id", "name"],
        },
      })
      .skip(page * limit)
      .limit(limit)
      .sort({ _id: 1 })
      .collation({ locale: "en_US", numericOrdering: true });
    // Get total count for pagination info
    const total = await LiteraryGroup.countDocuments(query);

    const formattedGroups = groups.map((group) => {
      // Filter out nulls and inactive students
      const activeStudents = group.studentsId.filter(
        (student) =>
          student && student.studentSpecificField?.status === "Active"
      );

      // Include leader and assistant leader in the list of participants if they are active
      const leaders = [group.leaderId, group.assistantLeaderId].filter(
        (leader) =>
          leader &&
          leader._id &&
          leader.studentSpecificField?.status === "Active"
      );

      const allActiveParticipants = [...activeStudents];
      leaders.forEach((leader) => {
        if (!allActiveParticipants.some((p) => p._id === leader._id)) {
          allActiveParticipants.push(leader);
        }
      });

      return {
        ...group.toObject(),
        leaderId: group.leaderId ? group.leaderId._id : "",
        leaderName: group.leaderId
          ? `${group.leaderId.name} (${group.leaderId._id})`
          : "",
        assistantLeaderId: group.assistantLeaderId
          ? group.assistantLeaderId._id
          : "",
        assistantLeaderName: group.assistantLeaderId
          ? `${group.assistantLeaderId.name} (${group.assistantLeaderId._id})`
          : "",
        studentsId: activeStudents.map((student) => student._id),
        studentsName: activeStudents
          .sort((a, b) => a._id - b._id)
          .map((student) => `${student._id} ${student.name}`),
        studentsDetails: allActiveParticipants.map((student) => ({
          ...student.toObject(),
          classId: student.studentSpecificField?.classId?._id,
          className: student.studentSpecificField?.classId?.name || "",
        })),
      };
    });

    return NextResponse.json(
      {
        groups: formattedGroups,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Groups fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();

    const body = await req.json();

    const existingGroups = await LiteraryGroup.find(
      { studentsId: { $in: body.studentsId } },
      { studentsId: 1 }
    ).populate({
      path: "studentsId",
      select: ["_id", "name"],
    });

    const existingStudents = existingGroups.flatMap(
      (group) => group.studentsId
    );

    const duplicateStudents = existingStudents.filter((student) =>
      body.studentsId.includes(student._id.toString())
    );

    const duplicateNames = duplicateStudents.map((s) => s.name).join(", ");

    if (duplicateStudents.length > 0) {
      return NextResponse.json(
        {
          message: `These students are already in another group: ${duplicateNames}`,
        },
        { status: 400 }
      );
    }

    const group = new LiteraryGroup(body);
    await group.save();

    return NextResponse.json(
      { message: "Group created successfully!", group },
      { status: 201 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();

    const body = await req.json();
    const { _id, ...updateData } = body;

    const existingGroups = await LiteraryGroup.find(
      { studentsId: { $in: body.studentsId }, _id: { $ne: _id } },

      { studentsId: 1 }
    ).populate({
      path: "studentsId",
      select: ["_id", "name"],
    });

    const existingStudents = existingGroups.flatMap(
      (group) => group.studentsId
    );

    const duplicateStudents = existingStudents.filter((student) =>
      body.studentsId.includes(student._id.toString())
    );

    const duplicateNames = duplicateStudents.map((s) => s.name).join(", ");

    if (duplicateStudents.length > 0) {
      return NextResponse.json(
        {
          message: `These students are already in another group: ${duplicateNames}`,
        },
        { status: 400 }
      );
    }

    const updatedGroup = await LiteraryGroup.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    );

    if (!updatedGroup) {
      return NextResponse.json(
        { message: "Group not found!" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Group updated successfully!", group: updatedGroup },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();

    const { ids } = await req.json();
    const _id = ids[0];
    if (ids.length > 1) {
      const deletedGroups = await LiteraryGroup.deleteMany({
        _id: { $in: ids },
      });
      return NextResponse.json(
        { deletedGroups, message: "Groups deleted successfully!" },
        { status: 200 }
      );
    }
    const deletedGroup = await LiteraryGroup.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedGroup, message: "Group deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
