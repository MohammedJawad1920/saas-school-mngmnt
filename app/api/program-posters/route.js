import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import ProgramRegistration from "@/models/ProgramRegistration";
import Program from "@/models/Program";
import Team from "@/models/Team";
import Division from "@/models/Division";
import User from "@/models/User";
import Participant from "@/models/Participant";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await connectToDB();

    // Grouping registrations by programId
    const registrations = await ProgramRegistration.find()
      .populate({
        path: "programId",
        select: "name type category divisionId",
        populate: {
          path: "divisionId",
          select: "name",
        },
      })
      .populate({
        path: "participants.id",
        select: "name chestNumber teamId",
        populate: {
          path: "teamId",
          select: "name",
        },
      })
      .lean(); // Fetch as lean objects

    // Collect all unique user IDs (participant IDs)
    const userIds = new Set();
    registrations.forEach((reg) => {
      reg.participants.forEach((p) => {
        if (p.id && p.id._id) {
          userIds.add(p.id._id);
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
      userProfileMap[u._id] = u.profilePic?.url || null;
    });

    // Group participants by program
    const programsMap = new Map();

    registrations.forEach((reg) => {
      if (!reg.programId) return;

      const progId = reg.programId._id.toString();

      if (!programsMap.has(progId)) {
        programsMap.set(progId, {
          _id: progId,
          name: reg.programId.name,
          category: reg.programId.category,
          type: reg.programId.type,
          division: reg.programId.divisionId?.name || "Unknown",
          participants: [],
        });
      }

      const programData = programsMap.get(progId);

      reg.participants.forEach((p) => {
        if (!p.id) return;
        const participantObj = p.id;
        
        programData.participants.push({
          _id: participantObj._id,
          name: participantObj.name,
          chestNumber: participantObj.chestNumber || "N/A",
          teamName: participantObj.teamId?.name || "Unknown",
          profilePic: userProfileMap[participantObj._id] || null,
        });
      });
    });

    // Filter out programs that have no participants
    const activePrograms = Array.from(programsMap.values()).filter(
        (p) => p.participants.length > 0
    );

    // Convert map to array and sort alphabetically by program name
    const result = activePrograms.sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    return NextResponse.json({ success: true, programs: result });
  } catch (error) {
    console.error("Error fetching program posters:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch program posters" },
      { status: 500 }
    );
  }
}
