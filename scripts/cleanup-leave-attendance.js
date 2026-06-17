import mongoose from "mongoose";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, "..", ".env.local");

let MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  try {
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/MONGODB_URI=(.+)/);
    if (match) {
      MONGODB_URI = match[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch (e) {
    console.error("⚠️  Could not read .env.local");
  }
}

const DRY_RUN = process.env.DRY_RUN !== "false";

if (!MONGODB_URI) {
  console.error("❌ ERROR: MONGODB_URI not found");
  process.exit(1);
}

const studentAttendanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  attendanceRecords: [
    {
      classId: String,
      batchId: String,
      subjectId: String,
      periodNumber: Number,
      day: String,
      date: Date,
      present: Boolean,
    },
  ],
});

const leaveRecordSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  classId: String,
  dateOfLeave: Date,
  dateOfArrival: Date,
  arrivedDate: Date,
});

const StudentAttendance =
  mongoose.models.StudentAttendance ||
  mongoose.model(
    "StudentAttendance",
    studentAttendanceSchema,
    "studentattendances"
  );

const LeaveRecord =
  mongoose.models.LeaveRecord ||
  mongoose.model("LeaveRecord", leaveRecordSchema, "leaverecords");

async function cleanupLeaveAttendance() {
  console.log("=".repeat(60));
  console.log("CLEANUP AUTO-MARKED LEAVE ATTENDANCE");
  console.log("=".repeat(60));
  console.log(
    `Mode: ${DRY_RUN ? "🔒 DRY RUN (safe)" : "🔴 LIVE MODE (destructive)"}`
  );
  console.log("=".repeat(60));

  if (!DRY_RUN) {
    console.log("\n⚠️  WARNING: RUNNING IN LIVE MODE!");
    console.log("This will mark suspicious attendance records as ABSENT.");
    console.log("Press Ctrl+C within 10 seconds to cancel...\n");
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  try {
    console.log("🔌 Connecting to database...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to database\n");

    // Get all leave records with arrivedDate
    const leaveRecords = await LeaveRecord.find({
      arrivedDate: { $exists: true, $ne: null },
    }).lean();

    console.log(
      `📊 Found ${leaveRecords.length} leave records with arrival dates\n`
    );

    let suspiciousRecordsCount = 0;
    const operations = [];
    const log = [];

    for (const leave of leaveRecords) {
      const arrivalDate = new Date(leave.arrivedDate);
      arrivalDate.setHours(0, 0, 0, 0);

      // Find student's attendance on arrival date
      const studentData = await StudentAttendance.findOne({
        studentId: leave.studentId,
      }).lean();

      if (!studentData) continue;

      // Check for suspicious patterns: ALL present on arrival day
      const arrivalDayRecords = studentData.attendanceRecords.filter(
        (record) => {
          const recordDate = new Date(record.date);
          recordDate.setHours(0, 0, 0, 0);
          return recordDate.getTime() === arrivalDate.getTime();
        }
      );

      if (arrivalDayRecords.length === 0) continue;

      // Check if ALL records on that day are present (suspicious)
      const allPresent = arrivalDayRecords.every((r) => r.present === true);

      if (allPresent && arrivalDayRecords.length > 0) {
        suspiciousRecordsCount++;

        log.push({
          studentId: leave.studentId,
          arrivalDate: arrivalDate.toISOString().split("T")[0],
          periodsCount: arrivalDayRecords.length,
          recordIds: arrivalDayRecords.map((r) => r._id),
          action: "Set present=false",
        });

        // ✅ Set present to false instead of removing records
        for (const record of arrivalDayRecords) {
          operations.push({
            updateOne: {
              filter: {
                _id: studentData._id,
                "attendanceRecords._id": record._id,
              },
              update: {
                $set: {
                  "attendanceRecords.$.present": false,
                },
              },
            },
          });
        }
      }
    }

    console.log(`📊 Analysis Results:`);
    console.log(
      `   - Students with suspicious auto-attendance: ${suspiciousRecordsCount}`
    );
    console.log(
      `   - Total records to correct (mark as absent): ${operations.length}\n`
    );

    if (operations.length === 0) {
      console.log("✅ No suspicious records found!");
      await mongoose.connection.close();
      process.exit(0);
    }

    // Save log
    const logFilename = `leave-attendance-cleanup-${new Date().toISOString().split("T")[0]}.json`;
    fs.writeFileSync(
      logFilename,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          dryRun: DRY_RUN,
          action: "Set present=false for auto-marked leave attendance",
          summary: {
            affectedStudents: suspiciousRecordsCount,
            recordsToCorrect: operations.length,
          },
          details: log,
        },
        null,
        2
      )
    );

    console.log(`📝 Log saved: ${logFilename}\n`);

    if (DRY_RUN) {
      console.log("🔒 DRY RUN COMPLETE - No changes made");
      console.log("\n📋 Review the log file above, then run:");
      console.log(
        "   DRY_RUN=false node scripts/cleanup-leave-attendance.js\n"
      );
    } else {
      console.log("🔴 Correcting attendance records (setting to absent)...");

      const batchSize = 100;
      let processed = 0;

      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);
        await StudentAttendance.bulkWrite(batch);
        processed += batch.length;
        console.log(`   Processed ${processed}/${operations.length}...`);
      }

      console.log("\n✅ Cleanup complete!");
      console.log(`   - ${operations.length} records marked as ABSENT`);
      console.log(`   - Teachers can review and correct if needed\n`);
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("✅ Database connection closed\n");
  }
}

cleanupLeaveAttendance();
