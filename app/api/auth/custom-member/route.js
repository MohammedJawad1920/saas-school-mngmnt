import { NextResponse } from 'next/server';
import connectToDB from '@/lib/db';
import OTP from '@/models/OTP';
import CustomRole from '@/models/CustomRole';
import { SignJWT } from 'jose';
import sendOtpEmail from '@/lib/sendOtpEmail';

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);
const MAX_ATTEMPTS = 3;

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/custom-member
// body: { action: 'send' | 'verify', email, otp? }
export async function POST(req) {
    try {
        await connectToDB();
        const { action, email, otp } = await req.json();
        const emailLower = email?.trim().toLowerCase();

        if (!emailLower) {
            return NextResponse.json({ message: 'Email is required' }, { status: 400 });
        }

        // Verify email belongs to at least one custom role
        const matchingRoles = await CustomRole.find({
            'members.email': emailLower,
        })
            .select('name members')
            .lean();

        if (!matchingRoles.length) {
            return NextResponse.json(
                { message: 'No custom role found for this email' },
                { status: 404 }
            );
        }

        // ── SEND OTP ──────────────────────────────────────────────────────────────
        if (action === 'send') {
            await OTP.deleteMany({ email: emailLower }); // clear old OTPs
            const newOtp = generateOTP();
            await OTP.create({ otp: newOtp, email: emailLower, attempts: 0 });

            const roleNames = matchingRoles.map((r) => r.name).join(', ');
            await sendOtpEmail(emailLower, newOtp);

            return NextResponse.json({ success: true, message: 'OTP sent to ' + emailLower });
        }

        // ── VERIFY OTP ────────────────────────────────────────────────────────────
        if (action === 'verify') {
            if (!otp) {
                return NextResponse.json({ message: 'OTP is required' }, { status: 400 });
            }

            const record = await OTP.findOne({ email: emailLower });
            if (!record) {
                return NextResponse.json(
                    { message: 'OTP expired or not found. Please request a new one.' },
                    { status: 400 }
                );
            }

            if (record.attempts >= MAX_ATTEMPTS) {
                await OTP.deleteOne({ _id: record._id });
                return NextResponse.json(
                    { message: 'Too many attempts. Please request a new OTP.' },
                    { status: 429 }
                );
            }

            if (record.otp !== otp.trim()) {
                await OTP.findByIdAndUpdate(record._id, { $inc: { attempts: 1 } });
                return NextResponse.json(
                    { message: `Invalid OTP. ${MAX_ATTEMPTS - record.attempts - 1} attempt(s) left.` },
                    { status: 400 }
                );
            }

            await OTP.deleteOne({ _id: record._id });

            // Build payload: member name from the first role
            const memberInfo = matchingRoles[0].members.find((m) => m.email === emailLower);
            const roleNames = matchingRoles.map((r) => r.name);

            const token = await new SignJWT({
                userId: emailLower, // Use email as ID for custom members
                email: emailLower,
                name: memberInfo?.name || emailLower,
                customRoles: roleNames,
                type: 'custom-member',
            })
                .setProtectedHeader({ alg: 'HS256' })
                .setExpirationTime('8h')
                .sign(SECRET_KEY);

            const res = NextResponse.json({
                success: true,
                message: 'Login successful!',
                name: memberInfo?.name || emailLower,
                roles: roleNames,
            });

            res.cookies.set('custom-member-token', token, {
                httpOnly: true,
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 8, // 8 hours
            });

            return res;
        }

        return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Custom member auth error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
