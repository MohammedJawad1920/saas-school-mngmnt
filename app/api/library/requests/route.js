import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import LibraryRequest from "@/models/LibraryRequest";
import LibraryBook from "@/models/LibraryBook";
import User from "@/models/User";

export async function GET(req) {
    try {
        await connectToDB();

        const url = new URL(req.url);
        const studentId = url.searchParams.get("studentId");
        const status = url.searchParams.get("status");

        const query = {};
        if (studentId) query.studentId = studentId;
        if (status) query.status = status;

        const requests = await LibraryRequest.find(query)
            .populate("bookId")
            .populate("studentId", "name _id")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ success: true, data: requests }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectToDB();
        const body = await req.json();

        const { bookId, studentId } = body;

        if (!bookId || !studentId) {
            return NextResponse.json({ success: false, msg: "Book ID and Student ID are required" }, { status: 400 });
        }

        // Check for existing pending request by this student for this book
        const existingRequest = await LibraryRequest.findOne({ 
            bookId, 
            studentId, 
            status: "Pending" 
        });

        if (existingRequest) {
            return NextResponse.json({ success: false, msg: "You already have a pending request for this book" }, { status: 400 });
        }

        const newRequest = await LibraryRequest.create({
            bookId,
            studentId,
            status: "Pending"
        });

        return NextResponse.json({ success: true, msg: "Request submitted successfully", data: newRequest }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await connectToDB();
        const body = await req.json();
        const { _id, ...updateData } = body;

        if (!_id) {
            return NextResponse.json({ success: false, msg: "Request ID is required" }, { status: 400 });
        }

        const updatedRequest = await LibraryRequest.findByIdAndUpdate(_id, updateData, { new: true });

        if (!updatedRequest) {
            return NextResponse.json({ success: false, msg: "Request not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, msg: "Request updated successfully", data: updatedRequest }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await connectToDB();
        
        let ids = [];
        const url = new URL(req.url);
        const singleId = url.searchParams.get("id");

        if (singleId) {
            ids = [singleId];
        } else {
            const body = await req.json();
            ids = body.ids || [];
        }

        if (!ids || ids.length === 0) {
            return NextResponse.json({ success: false, msg: "Request ID(s) required" }, { status: 400 });
        }

        await LibraryRequest.deleteMany({ _id: { $in: ids } });

        return NextResponse.json({ success: true, msg: "Request(s) deleted successfully" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message }, { status: 500 });
    }
}
