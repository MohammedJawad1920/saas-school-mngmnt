
import connectToDB from "../lib/db.js";
import StudentAttendance from "../models/StudentAttendance.js";

async function inspect() {
    await connectToDB();
    const records = await StudentAttendance.findOne({ "attendanceRecords.0": { $exists: true } });
    if (records) {
        console.log("Sample Record:", JSON.stringify(records.attendanceRecords[0], null, 2));
    } else {
        console.log("No records found");
    }
    process.exit(0);
}

inspect();
