import { NextResponse } from 'next/server';
import connectToDB from '@/lib/db';
import CustomRole from '@/models/CustomRole';
import apiResponse from '@/lib/apiResponse';

export async function GET() {
    try {
        await connectToDB();
        const roles = await CustomRole.find().sort({ createdAt: -1 }).lean();
        return NextResponse.json({ success: true, roles }, { status: 200 });
    } catch (error) {
        return apiResponse.error(error);
    }
}

export async function POST(req) {
    try {
        await connectToDB();
        const { name, description } = await req.json();

        if (!name?.trim()) {
            return NextResponse.json({ message: 'Role name is required' }, { status: 400 });
        }

        const existing = await CustomRole.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        });
        if (existing) {
            return NextResponse.json(
                { message: 'A role with this name already exists' },
                { status: 409 }
            );
        }

        const role = await CustomRole.create({
            name: name.trim(),
            description: description?.trim() || '',
            members: [],
        });

        return NextResponse.json(
            { success: true, role, message: 'Role created successfully!' },
            { status: 201 }
        );
    } catch (error) {
        return apiResponse.error(error);
    }
}
