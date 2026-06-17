import { apiResponse } from "@/lib/apiResponse";
import TeachersLeaveRecord from "@/models/TeachersLeaveRecord";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const url = new URL(req.url);

    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "page" && key !== "limit") {
        filterParams[key] = value;
      }
    }

    const query = {};
    if (filterParams?.teacherId) {
      query.teacherId = filterParams.teacherId;
    }
    if (filterParams?.classId) {
      query.classId = filterParams.classId;
    }
    if (filterParams?.periodNumber) {
      query.periodNumber = parseInt(filterParams.periodNumber);
    }
    if (filterParams?.date) {
      const startDate = new Date(filterParams.date);
      startDate.setUTCHours(0, 0, 0, 0);
      const nextDay = new Date(startDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      nextDay.setUTCHours(0, 0, 0, 0);
      query.date = { $gte: startDate, $lt: nextDay };
    }
    if (filterParams?.isForTimeTable === "true") {
      const endDate = new Date();
      endDate.setUTCHours(0, 0, 0, 0);

      const startDate = new Date(endDate);
      startDate.setUTCDate(startDate.getUTCDate() - 6);
      startDate.setUTCHours(0, 0, 0, 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    console.log("Teachers Leave Record Query:", query);

    const teachersLeaveRecord = await TeachersLeaveRecord.find(query)
      .populate("teacherId", "name")
      .populate("classId", "name")
      .sort({
        createdAt: -1,
      });

    return NextResponse.json({ teachersLeaveRecord }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const date = new Date(data.date);
    date.setUTCHours(0, 0, 0, 0);
    const teachersLeaveRecord = await TeachersLeaveRecord.updateOne(
      {
        teacherId: data.teacherId,
        date: date,
        periodNumber: data.periodNumber,
        classId: data.classId,
      },
      {
        $set: {
          leaveReason: data.leaveReason,
        },
      },
      { upsert: true }
    );

    return NextResponse.json(
      { message: "Team created successfully!", teachersLeaveRecord },
      { status: 201 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req) {
  try {
    const { _id } = await req.json();
    if (!_id) {
      return NextResponse.json(
        { success: false, error: "Record ID is required" },
        { status: 400 }
      );
    }

    const result = await TeachersLeaveRecord.findByIdAndDelete(_id);
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Leave record cleared successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
