import connectToDB from "@/lib/db";
import Attendance from "@/models/Attendance";
import Subject from "@/models/Subject";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        await connectToDB();
        const url = new URL(req.url);
        const classId = url.searchParams.get("classId");

        if (!classId) {
            return NextResponse.json({ message: "classId is required" }, { status: 400 });
        }

        // Find all unique subject IDs for this class from Attendance records
        const subjectIds = await Attendance.distinct("subjectId", { classId });

        // Fetch subject details for these IDs
        const subjects = await Subject.find({ _id: { $in: subjectIds } }, "_id name").lean();

        return NextResponse.json({ subjects }, { status: 200 });
    } catch (error) {
        console.error("historical-subjects error:", error);
        return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
    }
}
