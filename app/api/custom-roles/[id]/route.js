import { NextResponse } from 'next/server';
import connectToDB from '@/lib/db';
import CustomRole from '@/models/CustomRole';
import apiResponse from '@/lib/apiResponse';

// Rename role
export async function PUT(req, { params }) {
    try {
        await connectToDB();
        const { id } = await params;
        const { name, description } = await req.json();

        if (!name?.trim()) {
            return NextResponse.json({ message: 'Role name is required' }, { status: 400 });
        }

        const role = await CustomRole.findByIdAndUpdate(
            id,
            { name: name.trim(), description: description?.trim() || '' },
            { new: true, runValidators: true }
        );

        if (!role) {
            return NextResponse.json({ message: 'Role not found' }, { status: 404 });
        }

        return NextResponse.json(
            { success: true, role, message: 'Role updated successfully!' },
            { status: 200 }
        );
    } catch (error) {
        return apiResponse.error(error);
    }
}

// Delete entire role
export async function DELETE(req, { params }) {
    try {
        await connectToDB();
        const { id } = await params;
        const role = await CustomRole.findByIdAndDelete(id);

        if (!role) {
            return NextResponse.json({ message: 'Role not found' }, { status: 404 });
        }

        return NextResponse.json(
            { success: true, message: 'Role deleted successfully!' },
            { status: 200 }
        );
    } catch (error) {
        return apiResponse.error(error);
    }
}
