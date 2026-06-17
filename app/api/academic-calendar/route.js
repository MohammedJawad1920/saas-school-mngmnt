import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import AcademicCalendar from "@/models/AcademicCalendar";
import apiResponse from "@/lib/apiResponse";

export async function GET(req) {
    try {
        await connectToDB();
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get("page")) || 0;
        const limit = parseInt(url.searchParams.get("limit")) || Infinity;

        const query = {};
        const year = url.searchParams.get("year");
        const date = url.searchParams.get("date");

        if (year) query.year = parseInt(year);
        if (date) {
            const d = new Date(date);
            const start = new Date(d); start.setHours(0, 0, 0, 0);
            const end = new Date(d); end.setHours(23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        }

        const events = await AcademicCalendar.find(query)
            .sort({ date: 1 })
            .skip(page * (Number.isFinite(limit) ? limit : 0))
            .limit(Number.isFinite(limit) ? limit : 0);

        const total = await AcademicCalendar.countDocuments(query);

        return NextResponse.json({
            "academic-calendar": events,
            pagination: {
                page, limit, total,
                totalPages: Number.isFinite(limit) ? Math.ceil(total / limit) : 1,
            },
            message: "Academic calendar fetched successfully!",
        }, { status: 200 });
    } catch (error) {
        return apiResponse.error(error);
    }
}

export async function POST(req) {
    try {
        await connectToDB();
        const { title, date, description, time, type } = await req.json();

        if (!title || !date)
            return NextResponse.json({ message: "Title and date are required" }, { status: 400 });

        const eventDate = new Date(date);
        const event = await AcademicCalendar.create({
            title, date: eventDate, time,
            description, type: type || "Event",
            year: eventDate.getFullYear(),
        });

        return NextResponse.json(
            { "academic-calendar": event, message: "Event created successfully!" },
            { status: 201 }
        );
    } catch (error) {
        return apiResponse.error(error);
    }
}

export async function PUT(req) {
    try {
        await connectToDB();
        const { ids, ...updateData } = await req.json();

        if (!ids || ids.length === 0)
            return NextResponse.json({ message: "IDs are required" }, { status: 400 });

        if (updateData.date) {
            const d = new Date(updateData.date);
            updateData.date = d;
            updateData.year = d.getFullYear();
        }

        const event = await AcademicCalendar.findByIdAndUpdate(
            ids[0], { $set: updateData }, { new: true }
        );

        if (!event)
            return NextResponse.json({ message: "Event not found" }, { status: 404 });

        return NextResponse.json(
            { "academic-calendar": event, message: "Event updated successfully!" },
            { status: 200 }
        );
    } catch (error) {
        return apiResponse.error(error);
    }
}

export async function DELETE(req) {
    try {
        await connectToDB();
        const ids = await req.json();

        if (!ids || ids.length === 0)
            return NextResponse.json({ message: "IDs are required" }, { status: 400 });

        await AcademicCalendar.deleteMany({ _id: { $in: ids } });

        return NextResponse.json({ message: "Event(s) deleted successfully!" }, { status: 200 });
    } catch (error) {
        return apiResponse.error(error);
    }
}
