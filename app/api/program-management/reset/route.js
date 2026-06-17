// app/api/program-management/reset/route.js
import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";

// Program Management Models
import ProgramRegistration from "@/models/ProgramRegistration";
import Result from "@/models/Result";
import Participant from "@/models/Participant";
import Team from "@/models/Team";
import Division from "@/models/Division";
import Program from "@/models/Program";
import Schedule from "@/models/Schedule";

export async function POST(req) {
  try {
    // Get active role from headers
    const activeRole = req.headers.get("active-role");

    // Only Program Committee and Owner can reset data
    if (!["Program Committee", "Owner"].includes(activeRole)) {
      return NextResponse.json(
        {
          error:
            "Access denied. Only Program Committee and Owner can reset data.",
        },
        { status: 403 }
      );
    }

    await connectToDB();

    const body = await req.json();
    const { mode } = body;

    if (!["all", "registrations", "participants"].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid reset mode" },
        { status: 400 }
      );
    }

    console.log(`🔥 RESETTING PROGRAM DATA in mode: ${mode}`);

    // Define deletion operations
    const deletions = [];

    // 1. REGISTRATIONS & RESULTS - Common to all modes
    deletions.push(ProgramRegistration.deleteMany({}));
    deletions.push(Result.deleteMany({}));
    deletions.push(Schedule.deleteMany({}));
    console.log("✅ Queued: Registrations, Results, Schedules deletion");

    // Update related data
    deletions.push(Program.updateMany({}, { $set: { isRegistered: false } }));
    deletions.push(
      Division.updateMany({}, { $set: { hasRegistrations: false } })
    );
    deletions.push(
      Team.updateMany({}, { $set: { stagePoints: 0, offStagePoints: 0 } })
    );

    // 2. PARTICIPANTS & TEAMS - If mode is participants or all
    if (mode === "participants" || mode === "all") {
      deletions.push(Participant.deleteMany({}));
      deletions.push(Team.deleteMany({}));
      console.log("✅ Queued: Participants, Teams deletion");
    }

    // 3. FULL RESET - If mode is all
    if (mode === "all") {
      deletions.push(Division.deleteMany({}));
      deletions.push(Program.deleteMany({}));
      console.log("✅ Queued: Divisions, Programs deletion");
    }

    // Execute all deletions
    console.log(`📦 Executing ${deletions.length} operations...`);
    const results = await Promise.all(deletions);

    // Count total deletions
    const totalDeleted = results.reduce((sum, result) => {
      return sum + (result.deletedCount || result.modifiedCount || 0);
    }, 0);

    console.log(`✅ Reset complete! ${totalDeleted} records affected.`);

    return NextResponse.json(
      {
        message: "Data reset successfully",
        mode,
        totalDeleted,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ RESET API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
