import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Result from "@/models/Result";
import Team from "@/models/Team";
import Participant from "@/models/Participant";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await connectToDB();

    // 1. Fetch all teams
    const teams = await Team.find().lean();
    
    // Explicitly fetch all associated leaders to bypass Mongoose String-Ref bugs
    const leaderIds = [...new Set(teams.map(t => t.leaderId).filter(Boolean))];
    const users = await User.find({ _id: { $in: leaderIds } }, "name profilePic").lean();
    
    // Build literal map
    const userMap = {};
    users.forEach(u => { userMap[u._id] = u; });

    const teamMap = {};
    teams.forEach(team => {
      const explicitLeader = userMap[team.leaderId];
      
      teamMap[team._id.toString()] = {
        _id: team._id.toString(),
        name: team.name,
        points: 0,
        color: team.color || "#808080",
        leaderName: explicitLeader ? explicitLeader.name : "Unknown Leader",
        leaderPhoto: explicitLeader?.profilePic?.url || null
      };
    });

    // 2. Fetch all declared results and actively total up points
    const declaredResults = await Result.find({ isResultDeclared: true })
      .populate("participants.id")
      .lean();

    declaredResults.forEach(res => {
      if (!res.participants) return;
      res.participants.forEach(p => {
        if (!p.id || !p.id.teamId || !p.points) return;
        
        const teamIdStr = p.id.teamId.toString();
        
        if (teamMap[teamIdStr]) {
          teamMap[teamIdStr].points += p.points;
        }
      });
    });

    // 3. Flatten, sort by points descending
    const sortedTeams = Object.values(teamMap).sort((a, b) => b.points - a.points);

    // 4. Slice top 3 strictly and map officially designated titles
    const tops = sortedTeams.slice(0, 3);
    const titles = ["CHAMPIONS", "1ST RUNNERS UP", "2ND RUNNERS UP"];
    
    // Safety check just in case there are < 3 teams in the entire system returning points
    const finalPosters = tops.map((team, idx) => ({
      ...team,
      title: titles[idx] || "RUNNERS UP",
      rank: idx + 1
    }));

    return NextResponse.json({
      success: true,
      data: finalPosters
    });

  } catch (error) {
    console.error("Error fetching champions posters:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch champions data." },
      { status: 500 }
    );
  }
}
