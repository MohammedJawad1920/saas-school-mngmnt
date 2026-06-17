import mongoose from "mongoose";
import fs from "fs";
import { config } from "dotenv";

config({ path: ".env.local" });

const MONGODB_URI =
  "mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC";

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

const StudentAttendance =
  mongoose.models.StudentAttendance ||
  mongoose.model(
    "StudentAttendance",
    studentAttendanceSchema,
    "studentattendances"
  );

async function deduplicateAttendance() {
  console.log("=".repeat(60));
  console.log("ATTENDANCE DEDUPLICATION SCRIPT");
  console.log("=".repeat(60));
  console.log(
    `Mode: ${DRY_RUN ? "🔒 DRY RUN (safe)" : "🔴 LIVE MODE (destructive)"}`
  );
  console.log("=".repeat(60));

  if (!DRY_RUN) {
    console.log("\n⚠️  WARNING: RUNNING IN LIVE MODE!");
    console.log("This will PERMANENTLY modify your database.");
    console.log("Press Ctrl+C within 10 seconds to cancel...\n");
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  try {
    console.log("🔌 Connecting to database...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to database\n");

    console.log("🔍 Fetching student records...");

    // Get all student IDs first (lightweight query)
    const allStudents = await StudentAttendance.find(
      {},
      { studentId: 1 }
    ).lean();
    console.log(`📊 Found ${allStudents.length} student records to check\n`);

    let totalDuplicatesFound = 0;
    let totalRecordsToRemove = 0;
    const operations = [];
    const removalLog = [];
    let studentsProcessed = 0;

    // Process each student individually (memory-safe)
    for (const student of allStudents) {
      studentsProcessed++;

      if (studentsProcessed % 50 === 0) {
        console.log(
          `   Processed ${studentsProcessed}/${allStudents.length} students...`
        );
      }

      // Get this student's attendance records
      const studentData = await StudentAttendance.findOne({
        studentId: student.studentId,
      }).lean();

      if (!studentData || !studentData.attendanceRecords) continue;

      // Group by unique key
      const recordGroups = {};

      for (const record of studentData.attendanceRecords) {
        const key = `${record.classId}|${record.date}|${record.periodNumber}|${record.subjectId}`;

        if (!recordGroups[key]) {
          recordGroups[key] = [];
        }

        recordGroups[key].push(record);
      }

      // Find duplicates in this student's records
      for (const [key, records] of Object.entries(recordGroups)) {
        if (records.length > 1) {
          // Found a duplicate!
          totalDuplicatesFound++;

          // Decide which to keep
          let keepRecord;
          const presentRecords = records.filter((r) => r.present === true);

          if (presentRecords.length > 0) {
            keepRecord = presentRecords[0];
          } else {
            keepRecord = records[0];
          }

          const recordsToRemove = records.filter(
            (r) => String(r._id) !== String(keepRecord._id)
          );

          totalRecordsToRemove += recordsToRemove.length;

          // Log
          removalLog.push({
            student: student.studentId,
            date: new Date(records[0].date).toISOString().split("T")[0],
            class: records[0].classId,
            period: records[0].periodNumber,
            subject: records[0].subjectId,
            totalRecords: records.length,
            keeping: {
              id: keepRecord._id,
              present: keepRecord.present,
            },
            removing: recordsToRemove.map((r) => ({
              id: r._id,
              present: r.present,
            })),
          });

          // Build operations
          for (const record of recordsToRemove) {
            operations.push({
              updateOne: {
                filter: { _id: studentData._id },
                update: {
                  $pull: {
                    attendanceRecords: { _id: record._id },
                  },
                },
              },
            });
          }
        }
      }
    }

    console.log(`\n✅ Analysis complete!\n`);

    if (totalDuplicatesFound === 0) {
      console.log("✅ No duplicates found. Database is clean!");
      await mongoose.connection.close();
      process.exit(0);
    }

    // Save log
    const logFilename = `deduplication-log-${new Date().toISOString().split("T")[0]}.json`;
    fs.writeFileSync(
      logFilename,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          dryRun: DRY_RUN,
          summary: {
            duplicateGroups: totalDuplicatesFound,
            recordsToRemove: totalRecordsToRemove,
            recordsToKeep: totalDuplicatesFound,
          },
          details: removalLog,
        },
        null,
        2
      )
    );

    console.log(`📝 Detailed log saved to: ${logFilename}\n`);
    console.log(`📊 Summary:`);
    console.log(`   - Duplicate groups: ${totalDuplicatesFound}`);
    console.log(`   - Records to remove: ${totalRecordsToRemove}`);
    console.log(`   - Records to keep: ${totalDuplicatesFound}\n`);

    if (DRY_RUN) {
      console.log("🔒 DRY RUN COMPLETE - No changes made");
      console.log("\n📋 Review the log file above, then run:");
      console.log("   DRY_RUN=false node scripts/deduplicate-attendance.js\n");
    } else {
      console.log("🔴 Executing removals in batches...");

      const batchSize = 100;
      let processed = 0;

      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);
        await StudentAttendance.bulkWrite(batch);
        processed += batch.length;
        console.log(
          `   Processed ${processed}/${operations.length} operations...`
        );
      }

      console.log("\n✅ Deduplication complete!");
      console.log(`   - Total operations executed: ${operations.length}\n`);
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("✅ Database connection closed\n");
  }
}

deduplicateAttendance();
