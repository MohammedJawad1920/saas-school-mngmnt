import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Mark from "@/models/Mark";

export async function PUT(req, { params }) {
    try {
        await connectToDB();
        const body = await req.json();
        const mark = await Mark.findByIdAndUpdate(params.id, body, { new: true });
        return NextResponse.json({ success: true, data: mark });
    } catch (error) {
        console.error("PUT /api/marks/[id] error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        await connectToDB();
        await Mark.findByIdAndDelete(params.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/marks/[id] error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
