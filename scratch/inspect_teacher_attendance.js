import connectToDB from "../../lib/db.js";
import TeacherAttendance from "../../models/TeacherAttendance.js";

async function inspect() {
  await connectToDB();
  const teacherId = "TCH-002"; // Adjust if needed
  const doc = await TeacherAttendance.findOne({ teacherId }).lean();
  
  if (!doc) {
    console.log("No document found for", teacherId);
    return;
  }

  console.log("Teacher ID:", doc.teacherId);
  console.log("Total Records:", doc.attendanceRecords.length);
  
  // Look for records around today or recently
  const recent = doc.attendanceRecords.slice(-10);
  console.log("Recent 10 records:");
  recent.forEach(r => {
    console.log(`Date: ${r.date.toISOString()}, Class: ${r.classId}, Present: ${r.present}, Period: ${r.periodNumber}`);
  });

  process.exit(0);
}

inspect();
