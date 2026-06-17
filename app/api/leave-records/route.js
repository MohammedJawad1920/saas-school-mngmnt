import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import LeaveRecord from "@/models/LeaveRecord";
import StudentAttendance from "@/models/StudentAttendance";
import TimeTable from "@/models/TimeTable";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination parameters
      if (key !== "page" && key !== "limit" && key !== "projection") {
        filterParams[key] = value;
      }
    }

    // Get projection param
    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    // Convert projection param to MongoDB projection object
    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1; // Include each field
      });
    }

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams.studentId) {
      query.studentId = filterParams.studentId;
    }
    if (filterParams.classId) {
      query.classId = filterParams.classId;
    }
    if (filterParams.classIds) {
      query.classId = { $in: filterParams.classIds.split(",") };
    }
    if (filterParams.isArrived) {
      const isArrived = filterParams.isArrived === "true";
      if (isArrived) {
        query.arrivedDate = { $exists: true, $ne: null, $ne: "" };
      } else {
        query.$or = [
          { arrivedDate: { $exists: false } },
          { arrivedDate: null },
          { arrivedDate: "" },
        ];
      }
    }

    // Execute query with pagination
    const leaveRecords = await LeaveRecord.find(query, projections)
      .populate("studentId", ["_id", "name", "studentSpecificField"])
      .populate("classId", ["_id", "name"])
      .skip(page * limit)
      .limit(limit)
      .sort({ updatedAt: -1 });
    // Get total count for pagination info
    const total = await LeaveRecord.countDocuments(query);
    const formattedLeaveRecords = leaveRecords.map((record) => {
      return {
        ...record.toObject(),
        arrivedDate: record.arrivedDate || "",
        studentId: record.studentId?._id,
        studentName: record.studentId?.name,
        classId: record.classId?._id,
        className: record.classId?.name,
        studentStatus: record.studentId?.studentSpecificField?.status,
      };
    });

    return NextResponse.json(
      {
        "leave-records": formattedLeaveRecords,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Leave Records fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching leave records:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();

    const {
      studentId,
      classId,
      dateOfLeave,
      leaveReason,
      dateOfArrival,
      arrivedDate,
      lateReason,
      remark,
    } = await req.json();

    const isPending = await LeaveRecord.findOne({
      studentId,
      classId,
      $or: [
        { arrivedDate: { $exists: false } },
        { arrivedDate: null },
        { arrivedDate: "" },
      ],
    });
    if (isPending) {
      return NextResponse.json(
        { message: "Leave Record already pending!" },
        { status: 400 }
      );
    }
    const newLeaveRecord = await LeaveRecord.create({
      studentId,
      classId,
      dateOfLeave,
      leaveReason,
      dateOfArrival,
      arrivedDate,
      lateReason,
      remark,
    });
    return NextResponse.json(
      { newLeaveRecord, message: "Leave Record created successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();
    const body = await req.json();
    const {
      ids,
      studentId,
      classId,
      dateOfLeave,
      leaveReason,
      dateOfArrival,
      arrivedDate,
      lateReason,
      remark,
    } = body;

    console.log(body);
    const _id = Array.isArray(ids) ? ids[0] : ids;

    // ✅ FIXED: Don't auto-mark attendance when student arrives
    // Teachers should mark attendance normally
    // Leave records are just for tracking - not for auto-attendance

    if (ids && ids.length > 1) {
      const updatedLeaveRecords = await LeaveRecord.updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            studentId,
            classId,
            dateOfLeave,
            leaveReason,
            dateOfArrival,
            arrivedDate,
            lateReason,
            remark,
          },
        }
      );

      return NextResponse.json(
        {
          updatedLeaveRecords,
          message: "Leave Records Updated successfully!",
        },
        { status: 200 }
      );
    }

    const updatedLeaveRecord = await LeaveRecord.findOneAndUpdate(
      { _id },
      {
        $set: {
          studentId,
          classId,
          dateOfLeave,
          leaveReason,
          dateOfArrival,
          arrivedDate,
          lateReason,
          remark,
        },
      },
      { new: true }
    );

    return NextResponse.json(
      {
        updatedLeaveRecord,
        message: "Leave Record Updated successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();

    const { ids } = await req.json();
    const _id = ids[0];
    if (ids.length > 1) {
      const deletedLeaveRecords = await LeaveRecord.deleteMany({
        _id: { $in: ids },
      });
      return NextResponse.json(
        { deletedLeaveRecords, message: "Leave Records deleted successfully!" },
        { status: 200 }
      );
    }
    const deletedLeaveRecord = await LeaveRecord.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedLeaveRecord, message: "Leave Record deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
