// app/api/code-letters/route.js
import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import ProgramRegistration from "@/models/ProgramRegistration";
import Program from "@/models/Program";
import Division from "@/models/Division";
import Team from "@/models/Team";

// Helpers
const toId = (v) =>
  typeof v === "string" ? v : (v?.toString?.() ?? String(v));

// ----------------------------- GET -----------------------------
export async function GET(request) {
  try {
    await connectToDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;
    const skip = (page - 1) * limit;

    const divisionId = searchParams.get("divisionId");
    const teamId = searchParams.get("teamId");
    const type = searchParams.get("type");
    const category = searchParams.get("category");

    // Build registration query
    const regQuery = {};
    if (teamId) regQuery.teamId = teamId;

    // Get all registrations with program and division details
    const registrations = await ProgramRegistration.find(regQuery)
      .populate({
        path: "programId",
        select: "name type category divisionId",
        populate: {
          path: "divisionId",
          select: "name type",
        },
      })
      .populate("teamId", "name")
      .sort({ "programId.name": 1 });

    // Filter registrations based on criteria
    let filteredRegistrations = registrations.filter((reg) => {
      if (!reg.programId) return false;

      const program = reg.programId;
      const division = program.divisionId;

      if (divisionId && (!division || division._id.toString() !== divisionId)) {
        return false;
      }
      if (type && program.type !== type) {
        return false;
      }
      if (category && program.category !== category) {
        return false;
      }

      return true;
    });

    // Return registrations with detailed participant information
    const formattedRegistrations = filteredRegistrations.map((reg) => ({
      _id: reg._id,
      programId: reg.programId._id,
      programName: reg.programId.name,
      programType: reg.programId.type,
      programCategory: reg.programId.category,
      divisionId: reg.programId.divisionId?._id,
      divisionName: reg.programId.divisionId?.name,
      teamId: reg.teamId?._id,
      teamName: reg.teamId?.name,
      participants: reg.participants || [],
      status: reg.status,
      createdAt: reg.createdAt,
      updatedAt: reg.updatedAt,
    }));

    const totalCount = formattedRegistrations.length;
    const paginatedRegistrations = formattedRegistrations.slice(
      skip,
      skip + limit
    );

    return NextResponse.json({
      success: true,
      registrations: paginatedRegistrations,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalCount,
        hasNextPage: skip + limit < totalCount,
        hasPrevPage: page > 1,
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

// ----------------------------- PUT -----------------------------
export async function PUT(request) {
  try {
    await connectToDB();
    const body = await request.json();
    const { updates, userId, activeRole } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, message: "Updates are required" },
        { status: 400 }
      );
    }

    // Validate each update
    for (const update of updates) {
      if (!update.registrationId || !update.participantUpdates) {
        return NextResponse.json(
          {
            success: false,
            message: "Registration ID and participant updates are required",
          },
          { status: 400 }
        );
      }
    }

    // If Program Leader, check permissions
    if (activeRole === "Program Leader") {
      const leaderTeam = await Team.findOne({ leaderId: userId });
      if (!leaderTeam) {
        return NextResponse.json(
          { success: false, message: "Team not found for this program leader" },
          { status: 404 }
        );
      }

      // Check if the program leader owns these registrations
      const registrationIds = updates.map((u) => u.registrationId);
      const registrations = await ProgramRegistration.find({
        _id: { $in: registrationIds },
        teamId: leaderTeam._id,
      });

      const authorizedRegistrationIds = new Set(
        registrations.map((reg) => reg._id.toString())
      );

      const unauthorized = updates.filter(
        (update) =>
          !authorizedRegistrationIds.has(update.registrationId.toString())
      );

      if (unauthorized.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You can only assign code letters to participants in your team's registrations",
          },
          { status: 403 }
        );
      }
    }

    // Process updates - Update specific participants in specific registrations
    const updatePromises = updates.map(async (update) => {
      const { registrationId, participantUpdates } = update;

      // Check if any participants in this registration are evaluated
      const registration = await ProgramRegistration.findById(registrationId);
      if (!registration) {
        throw new Error(`Registration not found: ${registrationId}`);
      }

      const hasEvaluatedParticipants = registration.participants.some(
        (participant) => (participant.totalMarks || 0) > 0
      );

      if (hasEvaluatedParticipants) {
        throw new Error(
          `Cannot update code letters for registration with evaluated participants`
        );
      }

      // Update specific participants
      const updateOperations = {};
      Object.entries(participantUpdates).forEach(
        ([participantIndex, codeLetter]) => {
          const index = parseInt(participantIndex);
          if (index >= 0 && index < registration.participants.length) {
            updateOperations[`participants.${index}.codeLetter`] =
              codeLetter || "";
          }
        }
      );

      if (Object.keys(updateOperations).length === 0) {
        return { modifiedCount: 0 };
      }

      return await ProgramRegistration.updateOne(
        { _id: registrationId },
        { $set: updateOperations }
      );
    });

    const results = await Promise.all(updatePromises);
    const successCount = results.filter((r) => r.modifiedCount > 0).length;

    return NextResponse.json({
      success: true,
      message: `${successCount} registration(s) updated successfully`,
      updatedCount: successCount,
    });
  } catch (error) {
    console.error("Error updating participant code letters:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update participant code letters",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const data = await req.json();
    const { programId } = data;

    if (!programId) {
      return NextResponse.json(
        { success: false, message: "Program ID is required" },
        { status: 400 }
      );
    }

    const registrations = await ProgramRegistration.find({
      programId,
    });

    if (registrations.length === 0) {
      return NextResponse.json(
        { success: false, message: "No registrations found for this program" },
        { status: 404 }
      );
    }

    await ProgramRegistration.updateMany(
      { programId },
      {
        $set: {
          "participants.$[].codeLetter": "",
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Code letters deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting code letters:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to delete code letters",
      },
      { status: 500 }
    );
  }
}
