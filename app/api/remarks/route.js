import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Remark from "@/models/Remark";
import Class from "@/models/Class";
import User from "@/models/User";
import { apiResponse } from "@/lib/apiResponse";
import { parseUser } from "@/lib/utils";
import { headers, cookies } from "next/headers";

// @desc GET all remarks
// @route GET /api/remarks
export async function GET(req) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "page" && key !== "limit" && key !== "projection") {
        filterParams[key] = value;
      }
    }

    const headerStore = headers();
    const cookieStore = cookies();
    const user = parseUser(headerStore);
    const activeRole = cookieStore.get("active-role")?.value || headerStore.get("active-role");

    let query = {};

    const isMyRecords = filterParams.myRecords === "true" || url.searchParams.get("myRecords") === "true";

    if (activeRole === "Teacher") {
      if (isMyRecords) {
        query.teacherId = user.userId;
      } else {
        const teacherClass = await Class.findOne({ teacherId: user.userId });
        if (!teacherClass) {
          return apiResponse.error("You are not assigned to any class.", 403);
        }
        query.classId = teacherClass._id.toString();
      }
    } else if (activeRole !== "College Admin") {
      return apiResponse.error("You are not authorized to view remarks.", 403);
    }

    if (filterParams.classId) query.classId = filterParams.classId;
    if (filterParams.studentId) query.studentId = filterParams.studentId;
    if (filterParams.status) query.status = filterParams.status;
    if (filterParams.teacherId) query.teacherId = filterParams.teacherId;
    if (filterParams.comments) query.comments = { $regex: filterParams.comments, $options: "i" };

    if (filterParams.date) {
      const startDate = new Date(filterParams.date);
      const endDate = new Date(filterParams.date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    if (filterParams.studentName || filterParams.global) {
      const searchName = filterParams.global || filterParams.studentName;
      const students = await User.find({
        $or: [
          { name: { $regex: searchName, $options: "i" } },
          { _id: { $regex: searchName, $options: "i" } }
        ],
        roles: "Student",
      }).select("_id");
      const studentIds = students.map((s) => s._id);
      query.studentId = { $in: studentIds };
    }

    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1;
      });
    }

    const remarks = await Remark.find(query, projections)
      .populate("studentId", "name")
      .populate("teacherId", "name")
      .populate("classId", "name")
      .skip(page * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Remark.countDocuments(query);

    const formattedRemarks = remarks.map((remark) => ({
      ...remark.toObject(),
      studentId: remark.studentId?._id?.toString(),
      classId: remark.classId?._id?.toString(),
      teacherId: remark.teacherId?._id?.toString(),
      studentName: remark.studentId?.name,
      className: remark.classId?.name,
      teacherName: remark.teacherId?.name,
    }));

    return NextResponse.json(
      {
        remarks: formattedRemarks,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Remarks fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}

// @desc POST a new remark
// @route POST /api/remarks
export async function POST(req) {
  try {
    await connectToDB();

    const headerStore = headers();
    const user = parseUser(headerStore);

    const { studentId, classId, date, comments, status, teacherId } = await req.json();

    let assignedTeacherId = user.userId;
    const cookieStore = cookies();
    const activeRole = cookieStore.get("active-role")?.value || headerStore.get("active-role");

    if (activeRole === "College Admin" && teacherId) {
      assignedTeacherId = teacherId;
    }

    const newRemark = new Remark({
      studentId,
      classId,
      teacherId: assignedTeacherId,
      date,
      comments,
      status,
    });

    await newRemark.save();

    return NextResponse.json({ remark: newRemark, message: "Remark created successfully!" }, { status: 201 });
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}


// @desc PUT (update) a remark
// @route PUT /api/remarks
export async function PUT(req) {
  try {
    await connectToDB();

    const headerStore = headers();
    const cookieStore = cookies();
    const user = parseUser(headerStore);
    const activeRole = cookieStore.get("active-role")?.value || headerStore.get("active-role");

    const { ids, date, comments, status } = await req.json();

    const remarks = await Remark.find({ _id: { $in: ids } });

    if (!remarks || remarks.length === 0) {
      return apiResponse.error("No remarks found.", 404);
    }

    for (const remark of remarks) {
      if (remark.teacherId.toString() !== user.userId && activeRole !== "College Admin") {
        return apiResponse.error(`You are not authorized to edit remark ${remark._id}.`, 403);
      }
    }

    const updatedRemarks = await Remark.updateMany(
      { _id: { $in: ids } },
      { $set: { date, comments, status } }
    );

    return NextResponse.json({ updatedRemarks, message: "Remarks updated successfully!" }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}

// @desc DELETE a remark
// @route DELETE /api/remarks
export async function DELETE(req) {
  try {
    await connectToDB();

    const headerStore = headers();
    const cookieStore = cookies();
    const user = parseUser(headerStore);
    const activeRole = cookieStore.get("active-role")?.value || headerStore.get("active-role");

    const { ids } = await req.json();

    const remarks = await Remark.find({ _id: { $in: ids } });

    if (!remarks || remarks.length === 0) {
      return apiResponse.error("No remarks found.", 404);
    }

    for (const remark of remarks) {
      if (remark.teacherId.toString() !== user.userId && activeRole !== "College Admin") {
        return apiResponse.error(`You are not authorized to delete remark ${remark._id}.`, 403);
      }
    }

    await Remark.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({ message: "Remarks deleted successfully." }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error.message, 500);
  }
}