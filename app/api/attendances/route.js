import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import { 
  markTeacherAttendanceFromStudentAttendance,
  unmarkTeacherAttendanceFromStudentAttendance,
  syncTeacherAttendanceFromStudentAttendance
} from "@/lib/teacherAttendanceService";
import Attendance from "@/models/Attendance";
import StudentAttendance from "@/models/StudentAttendance";
import TeachersLeaveRecord from "@/models/TeachersLeaveRecord";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam === "0" ? Infinity : (parseInt(limitParam) || Infinity);

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

    if (filterParams.classId) {
      query.classId = filterParams.classId;
    }
    if (filterParams.batchId) {
      query.batchId = filterParams.batchId;
    }
    if (filterParams.subjectId) {
      query.subjectId = filterParams.subjectId;
    }
    if (filterParams.periodNumber) {
      query.periodNumber = parseInt(filterParams.periodNumber);
    }
    if (filterParams.date) {
      const targetDate = new Date(filterParams.date);
      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      
      query.date = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    } else if (filterParams.startDate && filterParams.endDate) {
      query.date = {
        $gte: new Date(`${filterParams.startDate}T00:00:00.000Z`),
        $lte: new Date(`${filterParams.endDate}T23:59:59.999Z`),
      };
    } else if (filterParams.startDate) {
      query.date = {
        $gte: new Date(`${filterParams.startDate}T00:00:00.000Z`),
      };
    } else if (filterParams.endDate) {
      query.date = { $lte: new Date(`${filterParams.endDate}T23:59:59.999Z`) };
    }

    if (filterParams.teacherId) {
      query.teacherId = filterParams.teacherId;
    }
    if (filterParams.day) {
      query.day = filterParams.day;
    }

    // Handle absentee tracking specific query parameter
    const trackAbsentees = url.searchParams.get("trackAbsentees") === "true";

    // Execute query with pagination
    let queryPromise = Attendance.find(query, projections)
      .skip(limit === Infinity ? 0 : (page * limit))
      .limit(limit === Infinity ? 0 : limit)
      .sort({ date: -1 });

    // Only populate if the fields are in projections (or projections is empty)
    const shouldPopulate = (field) => Object.keys(projections).length === 0 || projections[field] === 1;

    if (shouldPopulate("classId")) queryPromise = queryPromise.populate("classId", "name");
    if (shouldPopulate("batchId")) queryPromise = queryPromise.populate("batchId", "name");
    if (shouldPopulate("subjectId")) queryPromise = queryPromise.populate("subjectId", "name");
    if (shouldPopulate("teacherId")) queryPromise = queryPromise.populate("teacherId", "name");

    if (shouldPopulate("attendanceData")) {
      queryPromise = queryPromise.populate({
        path: "attendanceData",
        populate: {
          path: "studentId",
          select: "name email contactNumber studentSpecificField.guardianContactNumber",
        },
      });
    }

    const attendances = await queryPromise;
    const getStrId = (v) => (v?._id || v || "").toString();

    // Fetch leave records for these teachers/classes/periods on this date
    let leaveMap = {};
    try {
      const leaveQuery = {};
      if (query.date) leaveQuery.date = query.date;
      
      const leaveRecords = await TeachersLeaveRecord.find(leaveQuery).lean();
      
      const getDS = (d) => {
        const date = new Date(d);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      leaveRecords.forEach(lr => {
        const dateKey = getDS(lr.date);
        const key = `${getStrId(lr.teacherId)}_${getStrId(lr.classId)}_${lr.periodNumber}_${dateKey}`;
        leaveMap[key] = lr.leaveReason;
      });
    } catch (e) {
      console.error("Error fetching leave records for join:", e);
    }

    let formattedAttendances = attendances.map((attendance) => {
      const attendanceObj = attendance.toObject ? attendance.toObject() : attendance;
      
      const getDS = (d) => {
        const date = new Date(d);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Join leaveReason
      const dateKey = getDS(attendanceObj.date);
      const leaveKey = `${getStrId(attendanceObj.teacherId)}_${getStrId(attendanceObj.classId)}_${attendanceObj.periodNumber}_${dateKey}`;
      
      const baseObj = attendanceObj.attendanceData ? {
        ...attendanceObj,
        attendanceData: attendanceObj.attendanceData.map((student) => ({
          ...student,
          studentId: student.studentId?._id || student.studentId,
          studentName: student.studentId?.name,
          contactNumber: student.studentId?.contactNumber,
          guardianContactNumber: student.studentId?.studentSpecificField?.guardianContactNumber,
        })),
      } : attendanceObj;

      return {
        ...baseObj,
        leaveReason: leaveMap[leaveKey] || null
      };
    });

    // Enhanced processing for absentee tracking if requested
    if (trackAbsentees) {
      // Group attendance records by students and track continuous absences
      const studentAbsences = {};

      // Process each attendance record
      formattedAttendances.forEach((attendance) => {
        attendance.attendanceData.forEach((student) => {
          if (!studentAbsences[student.studentId]) {
            studentAbsences[student.studentId] = {
              studentId: student.studentId,
              studentName: student.studentName,
              absences: [],
              continuousAbsences: 0,
              lastAbsenceDate: null,
            };
          }

          // Add this absence record
          studentAbsences[student.studentId].absences.push({
            date: attendance.date,
            present: student.present,
          });
        });
      });

      // Calculate continuous absences for each student
      Object.values(studentAbsences).forEach((student) => {
        const istNow = new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        });
        const todayIST = new Date(istNow);
        todayIST.setUTCHours(0, 0, 0, 0);
        // Sort absences by date (newest first)
        const studentAbsencesArray = student.absences
          .filter((item) => new Date(item.date) <= todayIST)
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        // Count continuous absences
        for (const absence of studentAbsencesArray) {
          if (!absence.present) {
            student.continuousAbsences++;
            if (!student.lastAbsenceDate) {
              student.lastAbsenceDate = absence.date;
            }
          } else {
            // Break at first presence
            break;
          }
        }
      });

      // Add absentee tracking info to response
      formattedAttendances = {
        ...formattedAttendances,
        absenteeTracking: Object.values(studentAbsences)
          .filter((student) => student.continuousAbsences > 0)
          .sort((a, b) => b.continuousAbsences - a.continuousAbsences),
      };
    }

    // Get total count for pagination info
    const total = await Attendance.countDocuments(query);

    return NextResponse.json(
      {
        attendances: formattedAttendances,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Attendance records fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
export async function POST(req, res) {
  try {
    await connectToDB();
    const body = await req.json();

    // Validate required fields
    const requiredFields = [
      "classId",
      "batchId",
      "subjectId",
      "teacherId",
      "periodNumber",
      "day",
      "date",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // 🔒 STEP 1: Check if attendance already exists at Attendance level
    const existingAttendance = await Attendance.findOne({
      classId: body.classId,
      batchId: body.batchId,
      subjectId: body.subjectId,
      date: new Date(body.date),
      periodNumber: body.periodNumber,
    });

    if (existingAttendance) {
      return NextResponse.json(
        {
          error: "Attendance already recorded",
          message:
            "Attendance for this class, subject, period and date already exists.",
        },
        { status: 409 } // 409 Conflict
      );
    }

    // Create new attendance record
    let newAttendance;
    try {
      // Ensure batchId is a string if it's an object
      if (body.batchId && typeof body.batchId === 'object' && body.batchId._id) {
        body.batchId = body.batchId._id.toString();
      }
      newAttendance = await Attendance.create(body);
    } catch (createError) {
      console.error("❌ Attendance Creation/Validation Error:", {
        message: createError.message,
        errors: createError.errors,
        bodyPreview: {
          classId: body.classId,
          batchId: body.batchId,
          subjectId: body.subjectId,
          date: body.date
        }
      });
      throw createError;
    }

    await syncTeacherAttendanceFromStudentAttendance(newAttendance);

    // 🔒 STEP 2: Safe update - check for duplicates before adding to student records
    const bulkOps = [];
    let skippedCount = 0;

    for (const student of newAttendance.attendanceData) {
      // Check if this exact attendance record already exists for this student
      const existingRecord = await StudentAttendance.findOne({
        studentId: student.studentId,
        attendanceRecords: {
          $elemMatch: {
            date: new Date(newAttendance.date),
            classId: newAttendance.classId,
            periodNumber: newAttendance.periodNumber,
            subjectId: newAttendance.subjectId,
          },
        },
      });

      if (!existingRecord) {
        // Safe to add - no duplicate
        bulkOps.push({
          updateOne: {
            filter: { studentId: student.studentId },
            update: {
              $push: {
                attendanceRecords: {
                  classId: newAttendance.classId,
                  batchId: typeof newAttendance.batchId === 'object' && newAttendance.batchId?._id ? newAttendance.batchId._id.toString() : newAttendance.batchId,
                  subjectId: newAttendance.subjectId,
                  teacherId: newAttendance.teacherId, // Sync teacherId
                  periodNumber: newAttendance.periodNumber,
                  day: newAttendance.day,
                  date: newAttendance.date,
                  present: student.present,
                },
              },
            },
            upsert: true,
          },
        });
      } else {
        // Skip duplicate
        skippedCount++;
        console.warn(
          `⚠️ Duplicate skipped: Student ${student.studentId} already has attendance for ${newAttendance.date}, period ${newAttendance.periodNumber}`
        );
      }
    }

    // Execute the bulk operation if there are students
    if (bulkOps.length > 0) {
      await StudentAttendance.bulkWrite(bulkOps);
    }

    // Revalidate paths
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/time-tables");
    revalidatePath("/dashboard/my-time-table");

    return NextResponse.json(
      {
        attendance: newAttendance,
        message: "Attendance created successfully!",
        studentsUpdated: bulkOps.length,
        ...(skippedCount > 0 && {
          warning: `${skippedCount} students already had this attendance record`,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    // Handle duplicate key error for unique attendance records
    if (error.code === 11000) {
      return NextResponse.json(
        {
          error: "Attendance record already exists",
          message: "This attendance has already been recorded.",
        },
        { status: 409 }
      );
    }
    console.error("❌ Attendance POST generic error:", error);
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();

    const body = await req.json();
    const { _id, ...data } = body;

    const updatedAttendance = await Attendance.findOneAndUpdate({ _id }, data, {
      new: true,
      runValidators: true,
    });

    if (data.attendanceData) {
      for (const student of updatedAttendance.attendanceData) {
        // Check if this student already has this attendance record in their history
        const existingRecord = await StudentAttendance.findOne({
          studentId: student.studentId,
          attendanceRecords: {
            $elemMatch: {
              date: new Date(updatedAttendance.date),
              classId: updatedAttendance.classId,
              periodNumber: updatedAttendance.periodNumber,
              subjectId: updatedAttendance.subjectId,
            },
          },
        });

        if (existingRecord) {
          // UPDATE existing record
          await StudentAttendance.updateOne(
            {
              studentId: student.studentId,
              "attendanceRecords.date": updatedAttendance.date,
              "attendanceRecords.classId": updatedAttendance.classId,
              "attendanceRecords.subjectId": updatedAttendance.subjectId,
              "attendanceRecords.periodNumber": updatedAttendance.periodNumber,
            },
            {
              $set: { "attendanceRecords.$.present": student.present },
            }
          );
        } else {
          // PUSH new record if missing (e.g. student added after initial attendance was saved)
          await StudentAttendance.updateOne(
            { studentId: student.studentId },
            {
              $push: {
                attendanceRecords: {
                  classId: updatedAttendance.classId,
                  batchId: typeof updatedAttendance.batchId === 'object' && updatedAttendance.batchId?._id ? updatedAttendance.batchId._id.toString() : updatedAttendance.batchId,
                  subjectId: updatedAttendance.subjectId,
                  teacherId: updatedAttendance.teacherId,
                  periodNumber: updatedAttendance.periodNumber,
                  day: updatedAttendance.day,
                  date: updatedAttendance.date,
                  present: student.present,
                },
              },
            },
            { upsert: true }
          );
        }
      }
    }
    // Sync teacher attendance after update
    await syncTeacherAttendanceFromStudentAttendance(updatedAttendance);

    // Revalidate paths
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/attendance-tracking");
    revalidatePath("/api/teacherAttendances");

    return NextResponse.json(
      { updatedAttendance, message: "Attendance record updated successfully!" },
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
    console.log("Deleting attendance records with IDs:", ids);
    const _id = ids[0];

    const deletedAttendances = await Attendance.find({ _id: { $in: ids } });
    const bulkOps = [];

    for (const attendance of deletedAttendances) {
      // Logic for syncing with TeacherAttendance (Reset)
      await unmarkTeacherAttendanceFromStudentAttendance(attendance);

      for (const student of attendance.attendanceData) {
        bulkOps.push({
          updateOne: {
            filter: { studentId: student.studentId },
            update: {
              $pull: {
                attendanceRecords: {
                  classId: attendance.classId,
                  batchId: attendance.batchId,
                  subjectId: attendance.subjectId,
                  date: attendance.date,
                  periodNumber: attendance.periodNumber,
                },
              },
            },
          },
        });
      }
    }

    // Execute student attendance updates in bulk
    if (bulkOps.length > 0) {
      await StudentAttendance.bulkWrite(bulkOps);
    }

    if (ids.length > 1) {
      const result = await Attendance.deleteMany({ _id: { $in: ids } });

      // Revalidate paths
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/attendance-tracking");
      revalidatePath("/api/teacherAttendances");

      return NextResponse.json(
        {
          result,
          message: "Attendance records deleted successfully!",
        },
        { status: 200 }
      );
    }
    const deletedAttendance = await Attendance.findByIdAndDelete(_id);

    // Revalidate paths
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/time-tables");
    revalidatePath("/dashboard/my-time-table");

    return NextResponse.json(
      { deletedAttendance, message: "Attendance record deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
