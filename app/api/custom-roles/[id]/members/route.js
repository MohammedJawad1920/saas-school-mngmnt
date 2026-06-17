import { NextResponse } from 'next/server';
import connectToDB from '@/lib/db';
import CustomRole from '@/models/CustomRole';
import User from '@/models/User';
import apiResponse from '@/lib/apiResponse';

// Add member by email
export async function POST(req, { params }) {
    try {
        await connectToDB();
        const { id } = await params;
        const { email, name } = await req.json();

        if (!email?.trim()) {
            return NextResponse.json({ message: 'Email is required' }, { status: 400 });
        }

        const emailLower = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailLower)) {
            return NextResponse.json({ message: 'Invalid email format' }, { status: 400 });
        }

        const role = await CustomRole.findById(id);
        if (!role) {
            return NextResponse.json({ message: 'Role not found' }, { status: 404 });
        }

        // Prevent duplicates
        const alreadyMember = role.members.some((m) => m.email === emailLower);
        if (alreadyMember) {
            return NextResponse.json(
                { message: 'This email is already a member of this role' },
                { status: 409 }
            );
        }

        // Auto-resolve name from User collection if not provided
        let memberName = name?.trim() || '';
        if (!memberName) {
            const existingUser = await User.findOne({ email: emailLower }).select('name').lean();
            if (existingUser) memberName = existingUser.name;
        }

        role.members.push({ email: emailLower, name: memberName, addedAt: new Date() });
        await role.save();

        return NextResponse.json(
            { success: true, role, message: 'Member added successfully!' },
            { status: 200 }
        );
    } catch (error) {
        return apiResponse.error(error);
    }
}

// Remove member by email (?email=xxx@yyy.com)
export async function DELETE(req, { params }) {
    try {
        await connectToDB();
        const { id } = await params;
        const url = new URL(req.url);
        const email = url.searchParams.get('email');

        if (!email) {
            return NextResponse.json({ message: 'Email query param is required' }, { status: 400 });
        }

        const role = await CustomRole.findById(id);
        if (!role) {
            return NextResponse.json({ message: 'Role not found' }, { status: 404 });
        }

        const before = role.members.length;
        role.members = role.members.filter((m) => m.email !== email.toLowerCase());

        if (role.members.length === before) {
            return NextResponse.json({ message: 'Member not found in this role' }, { status: 404 });
        }

        await role.save();
        return NextResponse.json(
            { success: true, message: 'Member removed successfully!' },
            { status: 200 }
        );
    } catch (error) {
        return apiResponse.error(error);
    }
}
