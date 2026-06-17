import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";
import Division from "@/models/Division";
import Team from "@/models/Team";
import Program from "@/models/Program";
import Participant from "@/models/Participant";
import Schedule from "@/models/Schedule";
import Result from "@/models/Result";
import GradeScheme from "@/models/GradeScheme";
import ProgramRegistration from "@/models/ProgramRegistration";
import { apiResponse } from "@/lib/apiResponse";

export async function PUT(req) {
  try {
    await connectToDB();
    const { oldName, newName } = await req.json();

    if (!oldName || !newName) {
      return NextResponse.json({ message: "Names are required" }, { status: 400 });
    }

    // 1. Update Settings
    const settings = await Settings.findOne({});
    if (!settings) {
      return NextResponse.json({ message: "Settings not found" }, { status: 404 });
    }

    if (!settings.years.includes(oldName)) {
      return NextResponse.json({ message: "Year not found in settings" }, { status: 404 });
    }

    settings.years = settings.years.map(y => y === oldName ? newName : y);
    if (settings.activeYear === oldName) {
      settings.activeYear = newName;
    }
    await settings.save();

    // 2. Simple collection updates
    const simpleCollections = [
      Division,
      Team,
      Program,
      Schedule,
      Result,
      GradeScheme,
      ProgramRegistration
    ];

    for (const Model of simpleCollections) {
      await Model.updateMany({ year: oldName }, { $set: { year: newName } });
    }

    // 3. Participant Migration (Special Case for IDs)
    const participants = await Participant.find({ year: oldName });
    for (const p of participants) {
      const oldId = p._id;
      // Extract userId from oldId (e.g. "USER123-2025 november" -> "USER123")
      const userId = oldId.split("-").slice(0, -1).join("-") || oldId;
      const newId = `${userId}-${newName}`;

      // Clone participant with new ID and new Year
      const participantObj = p.toObject();
      delete participantObj._id;
      participantObj._id = newId;
      participantObj.year = newName;

      try {
        await Participant.create(participantObj);
        await Participant.deleteOne({ _id: oldId });

        // Update references in Results and ProgramRegistrations for this specific participant
        await Result.updateMany(
          { "participants.id": oldId },
          { $set: { "participants.$[elem].id": newId } },
          { arrayFilters: [{ "elem.id": oldId }] }
        );

        await ProgramRegistration.updateMany(
          { "participants.id": oldId },
          { $set: { "participants.$[elem].id": newId } },
          { arrayFilters: [{ "elem.id": oldId }] }
        );
      } catch (err) {
        console.error(`Error migrating participant ${oldId} to ${newId}:`, err);
        // Continue with others even if one fails
      }
    }

    return NextResponse.json({ message: "Year renamed and data migrated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Rename Year Error:", error);
    return apiResponse.error(error);
  }
}
