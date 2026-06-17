import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Program from "@/models/Program";
import Division from "@/models/Division";
import Participant from "@/models/Participant";
import ProgramRegistration from "@/models/ProgramRegistration";
import Schedule from "@/models/Schedule";
import Result from "@/models/Result";
import { getYear } from "@/lib/getYear";

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
      query._id = filterParams._id;
    }
    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }
    if (filterParams.type) {
      query.type = filterParams.type;
    }
    if (filterParams.category) {
      query.category = filterParams.category;
    }
    if (filterParams.divisionId) {
      query.divisionId = filterParams.divisionId;
    }
    if (filterParams.pointScheme) {
      query.pointScheme = filterParams.pointScheme;
    }
    if (filterParams.maxParticipants) {
      query.maxParticipants = parseInt(filterParams.maxParticipants);
    }

    // Add year to query
    query.year = await getYear(req);

    // Execute query with pagination
    const programs = await Program.find(query, projections)
      .populate("divisionId", ["_id", "name"])
      .skip(page * limit)
      .limit(limit)
      .sort({ name: 1 });

    // Get total count for pagination info
    const total = await Program.countDocuments(query);

    const formattedPrograms = programs.map((program) => ({
      ...program.toObject(),
      divisionId: program.divisionId?._id || "Unknown",
      divisionName: program.divisionId?.name || "Unknown",
    }));

    return NextResponse.json(
      {
        programs: formattedPrograms,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Programs fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching programs:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const data = await req.json();

    // Validate required fields
    const requiredFields = [
      "name",
      "type",
      "category",
      "divisionId",
      "maxParticipants",
      "pointScheme",
    ];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate enum values
    const validTypes = ["Group", "Individual"];
    const validCategories = ["Stage", "Off-Stage"];
    const validPointSchemes = [
      "3, 2, 1",
      "5, 3, 1",
      "10, 7, 5",
      "15, 10, 5",
      "20, 15, 10",
    ];

    if (!validTypes.includes(data.type)) {
      return NextResponse.json(
        { message: "Invalid program type. Must be 'Group' or 'Individual'" },
        { status: 400 }
      );
    }

    if (!validCategories.includes(data.category)) {
      return NextResponse.json(
        { message: "Invalid category. Must be 'Stage' or 'Off-Stage'" },
        { status: 400 }
      );
    }

    if (!validPointSchemes.includes(data.pointScheme)) {
      return NextResponse.json(
        { message: "Invalid point scheme" },
        { status: 400 }
      );
    }

    // Validate maxParticipants
    if (data.maxParticipants < 1) {
      return NextResponse.json(
        { message: "Maximum participants must be at least 1" },
        { status: 400 }
      );
    }

    // Ensure year is set
    if (!data.year) {
      data.year = await getYear(req);
    }

    // Create new program
    const program = await Program.create(data);

    await Division.updateOne(
      { _id: program.divisionId },
      { $addToSet: { programsId: program._id } }
    );

    return NextResponse.json(
      { message: "Program created successfully!", program },
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

    const programId = ids[0];
    const updateData = { ...data };
    delete updateData.ids;

    // Validate enum values if they're being updated
    if (updateData.type) {
      const validTypes = ["Group", "Individual"];
      if (!validTypes.includes(updateData.type)) {
        return NextResponse.json(
          { message: "Invalid program type. Must be 'Group' or 'Individual'" },
          { status: 400 }
        );
      }
    }

    if (updateData.category) {
      const validCategories = ["Stage", "Off-Stage"];
      if (!validCategories.includes(updateData.category)) {
        return NextResponse.json(
          { message: "Invalid category. Must be 'Stage' or 'Off-Stage'" },
          { status: 400 }
        );
      }
    }

    if (updateData.pointScheme) {
      const validPointSchemes = [
        "3, 2, 1",
        "5, 3, 1",
        "10, 7, 5",
        "15, 10, 5",
        "20, 15, 10",
      ];
      if (!validPointSchemes.includes(updateData.pointScheme)) {
        return NextResponse.json(
          { message: "Invalid point scheme" },
          { status: 400 }
        );
      }
    }

    // Validate maxParticipants if being updated
    if (
      updateData.maxParticipants !== undefined &&
      updateData.maxParticipants < 1
    ) {
      return NextResponse.json(
        { message: "Maximum participants must be at least 1" },
        { status: 400 }
      );
    }

    const prevProgram = await Program.findById(programId);

    const program = await Program.findOneAndUpdate(
      { _id: programId },
      { $set: updateData },
      { new: true }
    );

    if (!program) {
      return NextResponse.json(
        { message: "Program not found" },
        { status: 404 }
      );
    }

    // Handle division change
    if (
      updateData.divisionId &&
      updateData.divisionId !== prevProgram.divisionId
    ) {
      // Remove from old division
      await Division.updateOne(
        { _id: prevProgram.divisionId },
        { $pull: { programsId: program._id } }
      );

      // Add to new division
      await Division.updateOne(
        { _id: program.divisionId },
        { $addToSet: { programsId: program._id } }
      );
    }

    return NextResponse.json(
      { message: "Program updated successfully!", program },
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
    const programsToDelete = await Program.find({ _id: { $in: ids } }).select(
      "_id"
    );
    const programIds = programsToDelete.map((p) => p._id);

    const ProgramRegistrations = await ProgramRegistration.find({
      programId: { $in: programIds },
      "participants.totalMarks": { $gt: 0 },
    });

    if (ProgramRegistrations.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cannot delete programs with registrations with marks assigned",
        },
        { status: 400 }
      );
    }

    const deletedPrograms = await Program.deleteMany({ _id: { $in: ids } });

    if (deletedPrograms.deletedCount === 0) {
      return NextResponse.json(
        { message: "No programs found to delete" },
        { status: 404 }
      );
    }
    // Remove from divisions

    await Promise.all([
      Division.updateMany(
        { programsId: { $in: programIds } },
        { $pull: { programsId: { $in: programIds } } }
      ),
      ProgramRegistration.deleteMany({
        programId: { $in: programIds },
      }),
      Schedule.deleteMany({
        programId: { $in: programIds },
      }),
      Participant.updateMany(
        { "programs.id": { $in: programIds } },
        { $pull: { programs: { programId: { $in: programIds } } } }
      ),
      Result.deleteMany({
        programId: { $in: programIds },
      }),
    ]);

    return NextResponse.json(
      {
        message: `${deletedPrograms.deletedCount} program(s) deleted successfully!`,
        deletedPrograms,
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
