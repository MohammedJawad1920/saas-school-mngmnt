import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Result from "@/models/Result";
import Program from "@/models/Program";
import Team from "@/models/Team";
import Division from "@/models/Division";
import User from "@/models/User";
import Participant from "@/models/Participant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await connectToDB();

    // Fetch declared results
    const results = await Result.find({ isResultDeclared: true })
      .populate({
        path: "programId",
        select: "name type category divisionId pointScheme",
        populate: {
          path: "divisionId",
          select: "name",
        },
      })
      .lean();

    // Manual fallback for participants if populate failed
    const participantIdsToFetch = new Set();
    results.forEach(res => {
      res.participants.forEach(p => {
        if (!p.id || typeof p.id === 'string') {
          const pid = p.id?._id || p.id;
          if (pid) participantIdsToFetch.add(pid);
        }
      });
    });

    let manualParticipantMap = {};
    if (participantIdsToFetch.size > 0) {
      const manualParticipants = await Participant.find({ 
        _id: { $in: Array.from(participantIdsToFetch) } 
      }).populate('teamId', 'name color').lean();
      
      manualParticipants.forEach(p => {
        manualParticipantMap[String(p._id)] = p;
      });
    }

    // Collect all unique user IDs for winners
    const userIds = new Set();
    results.forEach((res) => {
      res.participants.forEach((p) => {
        const participantDoc = p.id && typeof p.id === 'object' && p.id.name ? p.id : manualParticipantMap[String(p.id?._id || p.id)];
        if (p.rank >= 1 && p.rank <= 3 && participantDoc) {
          const userId = String(participantDoc._id).split("-")[0];
          userIds.add(userId);
        }
      });
    });

    // Fetch user profiles for photos
    const users = await User.find(
      { _id: { $in: Array.from(userIds) } },
      "profilePic"
    ).lean();

    const userProfileMap = {};
    users.forEach((u) => {
      userProfileMap[String(u._id)] = u.profilePic?.url || null;
    });

    const winnersMap = new Map();

    results.forEach((res) => {
      if (!res.programId) return;

      const progId = res.programId._id.toString();

      if (!winnersMap.has(progId)) {
        winnersMap.set(progId, {
          _id: progId,
          name: res.programId.name,
          category: res.programId.category,
          type: res.programId.type,
          division: res.programId.divisionId?.name || "Unknown",
          winners: [],
        });
      }

      const programData = winnersMap.get(progId);

      // Only take ranks 1 to 3
      res.participants.forEach((p) => {
        const participantObj = (p.id && typeof p.id === 'object' && p.id.name) ? p.id : manualParticipantMap[String(p.id?._id || p.id)];
        if (!participantObj || p.rank < 1 || p.rank > 3) return;
        
        const userId = String(participantObj._id).split("-")[0];

        programData.winners.push({
          _id: participantObj._id,
          name: participantObj.name,
          chestNumber: participantObj.chestNumber || "N/A",
          teamName: participantObj.teamId?.name || "Unknown",
          teamColor: participantObj.teamId?.color || "#808080",
          profilePic: userProfileMap[userId] || null,
          rank: p.rank,
          points: p.points,
          grade: p.grade,
          codeLetter: p.codeLetter || "",
        });
      });

      // Sort winners by rank
      programData.winners.sort((a, b) => a.rank - b.rank);
    });

    // Filter out programs with no winners
    const activePrograms = Array.from(winnersMap.values()).filter(
        (p) => p.winners.length > 0
    );

    // Convert map to array and sort alphabetically by program name
    const finalResult = activePrograms.sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({ success: true, programs: finalResult });
  } catch (error) {
    console.error("Error fetching winner posters:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch winner posters" },
      { status: 500 }
    );
  }
}
