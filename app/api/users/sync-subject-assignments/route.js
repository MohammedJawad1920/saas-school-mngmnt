import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import { NextResponse } from "next/server";

/**
 * POST /api/users/sync-subject-assignments
 *
 * Full reset: for every Active student who has a classId, set their
 * subjectTypeAssignments to exactly ["{classId}:CORE", "{classId}:MAJOR"].
 *
 * All previous assignments (including stale cross-class ones) are removed.
 * Students without a classId are skipped.
 */
export async function POST(req) {
  try {
    await connectToDB();

    // Fetch all active students that have a classId assigned
    const students = await User.find({
      roles: "Student",
      "studentSpecificField.status": "Active",
      "studentSpecificField.classId": { $exists: true, $ne: null, $ne: "" },
    })
      .select("_id studentSpecificField.classId studentSpecificField.subjectTypeAssignments")
      .lean();

    if (students.length === 0) {
      return NextResponse.json(
        { message: "No active students with a class found.", updated: 0 },
        { status: 200 }
      );
    }

    const bulkOps = [];

    for (const student of students) {
      const classId = student.studentSpecificField?.classId;
      if (!classId) continue;

      const existing = student.studentSpecificField?.subjectTypeAssignments || [];
      const coreTag  = `${classId}:CORE`;
      const majorTag = `${classId}:MAJOR`;

      // Already exactly correct — only the two tags for the current class, nothing else
      const alreadyCorrect =
        existing.length === 2 &&
        existing.includes(coreTag) &&
        existing.includes(majorTag);

      if (alreadyCorrect) continue;

      // Reset to only the current class's assignments
      bulkOps.push({
        updateOne: {
          filter: { _id: student._id },
          update: {
            $set: {
              "studentSpecificField.subjectTypeAssignments": [coreTag, majorTag],
            },
          },
        },
      });
    }

    if (bulkOps.length === 0) {
      return NextResponse.json(
        {
          message: "All active students already have correct subject assignments.",
          updated: 0,
          total: students.length,
        },
        { status: 200 }
      );
    }

    const result = await User.bulkWrite(bulkOps);

    return NextResponse.json(
      {
        message: `Subject assignments synced for ${result.modifiedCount} student(s).`,
        updated: result.modifiedCount,
        total: students.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error syncing subject assignments:", error);
    return apiResponse.error(error);
  }
}
