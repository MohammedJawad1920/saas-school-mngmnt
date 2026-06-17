import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Result from "@/models/Result";
import Team from "@/models/Team";
import Participant from "@/models/Participant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    // Parse limit if provided
    const limit = limitParam ? parseInt(limitParam, 10) : null;

    await connectToDB();

    // 1. Fetch all teams to initialize points
    const teams = await Team.find().lean();
    const teamMap = {};
    teams.forEach(team => {
      teamMap[team._id.toString()] = {
        _id: team._id.toString(),
        name: team.name,
        points: 0,
        color: team.color || "#808080"
      };
    });

    // 2. Fetch declared results chronologically
    const resultsQuery = Result.find({ isResultDeclared: true })
      .populate("participants.id")
      .sort({ updatedAt: 1 }); // Sorted oldest to newest

    let declaredResults = await resultsQuery.lean();

    const totalResultsAvailable = declaredResults.length;

    // 3. Apply chronological limit if specified ("After X Results")
    if (limit !== null && !isNaN(limit) && limit >= 0) {
      declaredResults = declaredResults.slice(0, limit);
    }

    // 4. Calculate total points across the filtered results
    declaredResults.forEach(res => {
      if (!res.participants) return;
      res.participants.forEach(p => {
        // Validation check for ID and points presence
        if (!p.id || !p.id.teamId || !p.points) return;
        
        const teamIdStr = p.id.teamId.toString();
        
        if (teamMap[teamIdStr]) {
          teamMap[teamIdStr].points += p.points;
        }
      });
    });

    // 5. Build final array mapped by points
    const teamPointsArray = Object.values(teamMap).sort((a, b) => b.points - a.points);

    const teamColors = {};
    teams.forEach(t => {
      teamColors[t.name] = t.color || "#808080";
    });

    return NextResponse.json({
      success: true,
      teams: teamPointsArray,
      teamColors,
      totalResultsAvailable,
      appliedLimit: limit !== null ? limit : totalResultsAvailable
    });

  } catch (error) {
    console.error("Error fetching team points poster:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch team points" },
      { status: 500 }
    );
  }
}
