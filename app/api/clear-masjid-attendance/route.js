import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import MasjidAttendance from "@/models/MasjidAttendance";
import StudentMasjidAttendance from "@/models/StudentMasjidAttendance";

export async function GET(req) {
    try {
        await connectToDB();

        // double check we are not deleting Users
        // This script only acts on attendance collections

        const deletedDailyLogs = await MasjidAttendance.deleteMany({});
        const deletedStudentHistory = await StudentMasjidAttendance.deleteMany({});

        return NextResponse.json({
            message: "Masjid Attendance Data Cleared Successfully",
            deletedDailyLogs: deletedDailyLogs.deletedCount,
            deletedStudentHistory: deletedStudentHistory.deletedCount,
            filesAffected: ["MasjidAttendance", "StudentMasjidAttendance"],
            notes: "Student profiles (User collection) were NOT touched."
        }, { status: 200 });
    } catch (error) {
        console.error("Error clearing attendance:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
