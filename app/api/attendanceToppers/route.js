import connectToDB from "@/lib/db";
import StudentAttendance from "@/models/StudentAttendance";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/apiResponse";

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);

    // Extract required filter parameters
    const classId = url.searchParams.get("classId");
    const batchId = url.searchParams.get("batchId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit") || "10");

    // Create filter options object
    const filterOptions = {
      classId,
      batchId,
      startDate,
      endDate,
      page,
      limit,
    };

    // Call the static method to get attendance toppers
    const result = await StudentAttendance.getAttendanceToppers(filterOptions);

    // Return the response
    return NextResponse.json(
      {
        success: true,
        attendanceToppers: result.toppers,
        pagination: result.pagination,
        highestPercentage: result.highestPercentage,
        message: "Attendance toppers fetched successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching attendance toppers:", error);
    return apiResponse.error(error);
  }
}
