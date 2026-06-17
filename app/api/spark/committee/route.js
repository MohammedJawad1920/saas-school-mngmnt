
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import SparkCommitteeMember from "@/models/SparkCommitteeMember";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        await connectToDB();
        const members = await SparkCommitteeMember.find().sort({ order: 1 });
        return NextResponse.json(members, { status: 200 });
    } catch (error) {
        return apiResponse.error(error);
    }
}

export async function POST(req) {
    try {
        await connectToDB();
        const data = await req.json();

        const newMember = await SparkCommitteeMember.create(data);
        return NextResponse.json(
            { member: newMember, message: "Member added successfully!" },
            { status: 201 }
        );
    } catch (error) {
        return apiResponse.error(error);
    }
}

export async function PUT(req) {
    try {
        await connectToDB();
        const { _id, ...data } = await req.json();

        if (!_id) {
            return NextResponse.json({ message: "ID is required" }, { status: 400 });
        }

        const updatedMember = await SparkCommitteeMember.findByIdAndUpdate(
            _id,
            data,
            { new: true }
        );

        if (!updatedMember) {
            return NextResponse.json({ message: "Member not found" }, { status: 404 });
        }

        return NextResponse.json(
            { member: updatedMember, message: "Member updated successfully!" },
            { status: 200 }
        );
    } catch (error) {
        return apiResponse.error(error);
    }
}

export async function DELETE(req) {
    try {
        await connectToDB();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ message: "ID is required" }, { status: 400 });
        }

        const deletedMember = await SparkCommitteeMember.findByIdAndDelete(id);

        if (!deletedMember) {
            return NextResponse.json({ message: "Member not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Member deleted successfully!" }, { status: 200 });

    } catch (error) {
        return apiResponse.error(error);
    }
}
