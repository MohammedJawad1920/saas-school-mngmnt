import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Result from "@/models/Result";
import Program from "@/models/Program";
import Team from "@/models/Team";
import Participant from "@/models/Participant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    // Parse limit if provided safely
    const limit = limitParam ? parseInt(limitParam, 10) : null;

    await connectToDB();

    // 1. Fetch all teams purely to bootstrap our initial 0-point mapping
    const teams = await Team.find({}).lean();
    const activeTeamsArray = teams.map(t => t.name);

    // Initial state mapping dictionary
    const runningTotals = {};
    activeTeamsArray.forEach(name => {
      runningTotals[name] = 0;
    });

    // 2. Fetch all fully declared programmatic results SORTED historically
    const resultsQuery = Result.find({ isResultDeclared: true })
      .sort({ updatedAt: 1 })
      .populate("programId", "name code")
      .populate({
        path: "participants.id",
        populate: { path: "teamId", select: "name" }
      });

    let declaredResults = await resultsQuery.lean();
    const totalResultsAvailable = declaredResults.length;

    // Apply chronological limit if technically selected ("After X Results")
    if (limit !== null && !isNaN(limit) && limit >= 0) {
      declaredResults = declaredResults.slice(0, limit);
    }

    // 3. Systematically reconstruct timeline snapshots
    const progressionData = [];

    // Push explicitly state zero (Beginning of competition empty board)
    progressionData.push({
      event: "Start",
      ...runningTotals
    });

    declaredResults.forEach((res, index) => {
      if (!res.participants) return;

      let eventCausedChange = false;

      // Extract specific points awarded during this snapshot event
      res.participants.forEach(p => {
        // Safe null-checks recursively on deep populations
        if (p.id && p.id.teamId && p.id.teamId.name && p.points) {
          const teamName = p.id.teamId.name;
          // Dynamically mutate cumulative memory bank payload
          if (runningTotals[teamName] !== undefined) {
             runningTotals[teamName] += p.points;
             eventCausedChange = true;
          }
        }
      });

      // Optional: Event labeling via numeric event count or explicit string extraction (Shorten long names if needed)
      const label = res.programId?.code || `Event ${index + 1}`;

      // Snapshot the updated metrics
      if (eventCausedChange) {
        progressionData.push({
          event: label,
          ...runningTotals
        });
      }
    });

    const teamColors = {};
    teams.forEach(t => {
      teamColors[t.name] = t.color || "#808080";
    });

    return NextResponse.json({
      success: true,
      teams: activeTeamsArray,
      data: progressionData,
      teamColors,
      totalResultsAvailable,
      appliedLimit: limit !== null ? limit : totalResultsAvailable
    });

  } catch (error) {
    console.error("Error generating chronological team points map:", error);
    return NextResponse.json(
      { success: false, message: "Failed to accurately re-simulate tournament progression history." },
      { status: 500 }
    );
  }
}
