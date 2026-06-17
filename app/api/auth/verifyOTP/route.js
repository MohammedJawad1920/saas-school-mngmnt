import jwt from "jsonwebtoken";
import connectToDB from "@/lib/db";
import OTP from "@/models/OTP";
import { NextResponse } from "next/server";
import User from "@/models/User";

export async function POST(req) {
  const { email, otp } = await req.json(); // Extract email and OTP from request

  try {
    await connectToDB();

    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return NextResponse.json(
        { message: "OTP expired or not found" },
        { status: 400 }
      );
    }

    if (otpRecord.attempts >= 3) {
      return NextResponse.json(
        { message: "Maximum OTP attempts exceeded" },
        { status: 403 }
      );
    }

    if (otpRecord.otp !== otp) {
      await OTP.updateOne({ email }, { $inc: { attempts: 1 } }); // Increment attempts
      return NextResponse.json(
        { message: "Invalid OTP. Try again." },
        { status: 400 }
      );
    }

    // OTP is correct, delete it from the database
    await OTP.deleteOne({ email });

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const token = jwt.sign(
      { userId: user?._id, email },
      process.env.JWT_SECRET,
      {
        expiresIn: "1y",
      }
    );
    const response = NextResponse.json({
      message: "OTP verification successful",
      success: true,
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Secure in production
      maxAge: 60 * 60 * 24 * 365, // 1 year in seconds
      sameSite: "strict",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error verifying OTP:", error.message);
    return NextResponse.json(
      { message: "OTP verification failed" },
      { status: 500 }
    );
  }
}
