import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import sendOtpEmail from "@/lib/sendOtpEmail";
import { generateSecureOTP } from "@/lib/utils";
import OTP from "@/models/OTP";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function POST(req) {
  const { email } = await req.json();
  try {
    await connectToDB();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const otp = generateSecureOTP();

    // Store OTP in the database
    await OTP.findOneAndUpdate(
      { email }, // Find by email
      { otp, attempts: 0, createdAt: new Date() }, // Update OTP and reset attempts
      { upsert: true, new: true } // Create if not exists
    );
    console.log(otp);
    console.log("Email:", user.email);

    await sendOtpEmail(user.email, otp);
    return NextResponse.json(
      { message: "OTP sent successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
