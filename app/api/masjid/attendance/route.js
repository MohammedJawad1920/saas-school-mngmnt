import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import MasjidAttendance from "@/models/MasjidAttendance";
import { headers } from "next/headers";
import User from "@/models/User"; // Assuming User model exists for validation

// Helper to validate API Key (simplified for this context)
const validateApiKey = (req) => {
    // In a real app, you'd check headers or query params against a stored key
    // For now, we assume the middleware handles the main auth, but we can check for the key presence
    const url = new URL(req.url);
    const apiKey = url.searchParams.get("apiKey");
    return !!apiKey;
};

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const date = searchParams.get("date");
        const prayer = searchParams.get("prayer");
        const classId = searchParams.get("classId");
        const distinctField = searchParams.get("distinct");

        console.log(`GET /api/masjid/attendance - Date: ${date}, Prayer: ${prayer}, ClassId: ${classId}`);

        if (distinctField) {
            const distinctValues = await MasjidAttendance.distinct(distinctField);
            return NextResponse.json({ [distinctField]: distinctValues }, { status: 200 });
        }

        const query = {};

        if (date) {
            const queryDate = new Date(date);
            const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
            query.date = { $gte: startOfDay, $lte: endOfDay };
        }

        if (prayer) query.prayer = prayer;
        if (classId) query.classId = classId;

        const attendances = await MasjidAttendance.find(query)
            .populate("classId", "name")
            .populate("batchId", "name")
            .populate("markedBy", "name")
            .populate("attendanceData.studentId", "name profilePic");

        return NextResponse.json({ attendances }, { status: 200 });
    } catch (error) {
        console.error("GET /api/masjid/attendance Error:", error);
        return NextResponse.json(
            { message: "Internal Server Error", error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(req) {
    try {
        await connectDB();
        const body = await req.json();
        const { date, day, prayer, classId, batchId, markedBy, attendanceData } = body;

        if (!date || !day || !prayer || !classId || !batchId || !markedBy) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        // Ensure date is a Date object
        const attendanceDate = new Date(date);

        // Upsert logic: Find by date, prayer, and classId. If exists, update. If not, create.
        // We use findOneAndUpdate with upsert: true

        // Define the filter for uniqueness
        const filter = {
            // We need to match the date range for the specific day
            date: {
                $gte: new Date(new Date(attendanceDate).setHours(0, 0, 0, 0)),
                $lte: new Date(new Date(attendanceDate).setHours(23, 59, 59, 999)),
            },
            prayer,
            classId,
        };

        const update = {
            date: attendanceDate, // Ensure the date is set/updated
            day,
            prayer,
            classId,
            batchId,
            markedBy,
            attendanceData,
        };

        const result = await MasjidAttendance.findOneAndUpdate(filter, update, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
            runValidators: true,
        });

        return NextResponse.json(
            { message: "Attendance saved successfully", attendance: result },
            { status: 200 }
        );
    } catch (error) {
        console.error("POST /api/masjid/attendance Error:", error);
        return NextResponse.json(
            { message: "Internal Server Error", error: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(req) {
    try {
        await connectDB();
        const body = await req.json();
        const { ids } = body; // Expecting an array of IDs to delete

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { message: "Invalid or missing IDs" },
                { status: 400 }
            );
        }

        await MasjidAttendance.deleteMany({ _id: { $in: ids } });

        return NextResponse.json(
            { message: "Attendance records deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("DELETE /api/masjid/attendance Error:", error);
        return NextResponse.json(
            { message: "Internal Server Error", error: error.message },
            { status: 500 }
        );
    }
}
