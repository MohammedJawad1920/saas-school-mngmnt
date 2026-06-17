import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import { markAbsentTeachers } from "@/lib/teacherAttendanceService";
import Settings from "@/models/Settings";

export async function GET(req) {
  try {
    await connectToDB();

    const today = new Date();
    const istTime = new Date(today.getTime() + 5.5 * 60 * 60 * 1000);
    const dateString = istTime.toISOString().split("T")[0];

    const settings = await Settings.findOne({});

    if (!settings?.general?.isWorkingDay) {
      return NextResponse.json(
        { message: "college is closed today" },
        { status: 400 }
      );
    }

    const result = await markAbsentTeachers(dateString);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Failed to mark absent teachers:", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
