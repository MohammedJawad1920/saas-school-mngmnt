import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Mark from "@/models/Mark";

export async function GET(req) {
    try {
        await connectToDB();
        const { searchParams } = new URL(req.url);
        const classId = searchParams.get("classId");
        const studentId = searchParams.get("studentId");
        const classIdsParam = searchParams.get("classIds"); // comma-separated

        const filter = {};
        if (classIdsParam) {
            const ids = classIdsParam.split(",").map(s => s.trim()).filter(Boolean);
            filter.$or = [{ classId: { $in: ids } }, { classIds: { $in: ids } }];
        } else if (classId) {
            filter.$or = [{ classId }, { classIds: classId }];
        }
        if (studentId) filter["students.studentId"] = studentId;

        const marks = await Mark.find(filter)
            .sort({ createdAt: -1 })
            .populate("classId", "name")
            .populate("students.studentId", "name _id");
        return NextResponse.json({ success: true, data: marks });
    } catch (error) {
        console.error("GET /api/marks error:", error);
        return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectToDB();
        const body = await req.json();
        // Ensure classId is set for backward compat (first of classIds array)
        if (!body.classId && body.classIds?.length > 0) {
            body.classId = body.classIds[0];
        }
        const mark = await Mark.create(body);
        return NextResponse.json({ success: true, data: mark }, { status: 201 });
    } catch (error) {
        console.error("POST /api/marks error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
