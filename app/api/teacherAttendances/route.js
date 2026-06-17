import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import TeacherAttendance from "@/models/TeacherAttendance";
import TeachersLeaveRecord from "@/models/TeachersLeaveRecord";
import TimeTable from "@/models/TimeTable";
import User from "@/models/User";
import Class from "@/models/Class";
import Subject from "@/models/Subject";
import Settings from "@/models/Settings";
import { models } from "mongoose";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Helper to get consistent YYYY-MM-DD from any Date source using Local Time
const getDS = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export async function GET(req, res) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const filterParams = Object.fromEntries(url.searchParams.entries());
    const page = parseInt(filterParams.page || "0");
    const limitParam = filterParams.limit;
    const limit = limitParam === "0" ? Infinity : (parseInt(limitParam) || Infinity);

    // 1. Fetch relevant teachers
    const teacherQuery = { roles: "Teacher" };
    if (filterParams.teacherId) {
      teacherQuery._id = filterParams.teacherId;
    }
    if (filterParams.name) {
      teacherQuery.name = { $regex: filterParams.name, $options: "i" };
    }

    const allTeachers = await User.find(teacherQuery, "_id name").lean();

    // 4. Determine Date Range (Strict UTC) - Moved up to support holiday query
    let startDateParam = filterParams.startDate || filterParams.date;
    let endDateParam = filterParams.endDate || filterParams.date;

    if (!startDateParam && filterParams.year && filterParams.month) {
      const year = parseInt(filterParams.year);
      const month = parseInt(filterParams.month);
      startDateParam = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      endDateParam = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    if (!startDateParam) {
      startDateParam = new Date().toISOString().split('T')[0];
      endDateParam = startDateParam;
    }

    let startDate = new Date(startDateParam + "T00:00:00.000Z");
    let endDate = new Date(endDateParam + "T23:59:59.999Z");
    
    if (isNaN(startDate.getTime())) startDate = new Date();
    if (isNaN(endDate.getTime())) endDate = new Date(startDate);

    // 2. Fetch TimeTables, Settings, and Holidays for synthesis
    const [timeTables, settings, holidays] = await Promise.all([
      TimeTable.find({}).lean(),
      Settings.findOne({}).lean(),
      models.AcademicCalendar ? models.AcademicCalendar.find({
        date: { $gte: startDate, $lte: endDate },
        type: "Holiday"
      }).lean() : []
    ]);

    // Pre-process holidays into a quick lookup map
    const holidayMap = new Map();
    holidays.forEach(h => holidayMap.set(getDS(h.date), true));

    // 6. Synthesize Attendance History
    const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayDS = getDS(new Date());

    // 3. Pre-process schedule into a high-performance map
    const scheduleMap = {};
    timeTables.forEach(tt => {
      (tt.timeSlots || []).forEach(slot => {
        if (!slot.teacherId) return;
        const tId = slot.teacherId.toString();
        const day = slot.day;
        
        if (!scheduleMap[tId]) scheduleMap[tId] = {};
        if (!scheduleMap[tId][day]) scheduleMap[tId][day] = [];
        
        scheduleMap[tId][day].push({
          classId: tt.classId,
          subjectId: slot.subjectId,
          periodNumber: slot.periodNumber,
          day: slot.day,
          validFrom: slot.validFrom || tt.updatedAt || tt.createdAt,
          validTo: slot.validTo
        });
      });
    });

    const isTodayGlobalWorking = settings?.general?.isWorkingDay !== false;

    // 5. Fetch and map ALL actual marked attendance for these teachers
    const teacherIds = allTeachers.map(t => t._id.toString());
    const existingAttendances = await TeacherAttendance.find({
      teacherId: { $in: teacherIds }
    }).lean();

    const lookupMap = {};
    existingAttendances.forEach(doc => {
      const tId = doc.teacherId.toString();
      if (!lookupMap[tId]) lookupMap[tId] = {};
      
      (doc.attendanceRecords || []).forEach(r => {
        const dateKey = getDS(r.date);
        const key = `${dateKey}_${String(r.classId)}_${String(r.subjectId)}_${r.periodNumber}`;
        lookupMap[tId][key] = r;
      });
    });

    const formattedData = allTeachers.map(teacher => {
      const records = [];
      const teacherId = teacher._id.toString();
      const teacherSchedules = scheduleMap[teacherId] || {};
      const teacherLookups = lookupMap[teacherId] || {};
      const processedKeys = new Set();

      // 1. First, include ALL actual marked attendance records for this teacher in the range
      // This ensures history is visible even if the TimeTable was reset/deleted.
      Object.entries(teacherLookups).forEach(([key, actual]) => {
        const actualDate = new Date(actual.date);
        if (actualDate >= startDate && actualDate <= endDate) {
          records.push({
            ...actual,
            date: actual.date
          });
          processedKeys.add(key);
        }
      });

      // 2. Then, synthesize missing records from the current TimeTable schedule
      let curr = new Date(startDate);
      while (curr <= endDate) {
        const dayName = WEEKDAYS[curr.getUTCDay()];
        const dateString = getDS(curr);
        const daySlots = teacherSchedules[dayName] || [];

        // Determine if this day is a working day
        const isHoliday = holidayMap.has(dateString);
        const isImplicitHoliday = (dateString >= "2026-04-01" && dateString <= "2026-04-10") || (dateString >= "2026-05-25" && dateString <= "2026-06-05") || (dateString >= "2026-02-12" && dateString <= "2026-02-28");
        const isWorkingDay = !isHoliday && !isImplicitHoliday;
        // For today, the global toggle is the final truth. For other days, use the holiday calendar.
        const isEffectivelyWorking = (dateString === todayDS) ? isTodayGlobalWorking : isWorkingDay;

        daySlots.forEach(slot => {
          // Filter: Only include slots with subjects, UNLESS it is today (as requested)
          if (!slot.subjectId && dateString !== todayDS) return;

          // Apply filters
          if (filterParams.classId) {
             const classIds = String(filterParams.classId).split(',').map(s => s.trim());
             if (!classIds.includes(String(slot.classId))) return;
          }
          if (filterParams.subjectId) {
             const subjectIds = String(filterParams.subjectId).split(',').map(s => s.trim());
             if (!subjectIds.includes(String(slot.subjectId))) return;
          }
          
          const key = `${dateString}_${String(slot.classId)}_${String(slot.subjectId)}_${slot.periodNumber}`;
          
          const validFromDS = slot.validFrom ? getDS(slot.validFrom) : null;
          const validToDS = slot.validTo ? getDS(slot.validTo) : null;
          
          // Only add synthetic record if we haven't already added an actual record for this slot
          if (!processedKeys.has(key) && isEffectivelyWorking && dateString <= todayDS && (!validFromDS || dateString >= validFromDS) && (!validToDS || dateString < validToDS)) {
            records.push({
              _id: `synth_${teacher._id}_${dateString}_${slot.periodNumber}`,
              teacherId: teacher._id,
              date: new Date(curr),
              classId: slot.classId,
              subjectId: slot.subjectId,
              periodNumber: slot.periodNumber,
              present: false,
              synthetic: true
            });
            processedKeys.add(key);
          }
        });
        // UTC increment
        curr.setUTCDate(curr.getUTCDate() + 1);
      }

      return {
        _id: teacher._id,
        name: teacher.name,
        attendanceRecords: records
      };
    });

    // 7. Populate names for synthesized records
    const classIds = [...new Set(formattedData.flatMap(t => t.attendanceRecords.map(r => r.classId?.toString())))].filter(Boolean);
    const subjectIds = [...new Set(formattedData.flatMap(t => t.attendanceRecords.map(r => r.subjectId?.toString())))].filter(Boolean);

    // Fetch leave records for all teachers in the date range to join leaveReason
    const leaveRecords = await TeachersLeaveRecord.find({
      teacherId: { $in: teacherIds },
      date: { $gte: startDate, $lte: endDate },
    }, "teacherId classId periodNumber date leaveReason").lean();

    // Build a fast lookup: teacherId_classId_periodNumber_YYYY-MM-DD -> leaveReason
    const toStr = (v) => (v?._id || v || "").toString().trim();
    const leaveReasonMap = {};
    leaveRecords.forEach(lr => {
      const dateKey = getDS(lr.date);
      const key = `${toStr(lr.teacherId)}_${toStr(lr.classId)}_${lr.periodNumber}_${dateKey}`;
      if (lr.leaveReason) leaveReasonMap[key] = lr.leaveReason;
    });
    
    const [nameClasses, nameSubjects] = await Promise.all([
      Class.find({ _id: { $in: classIds } }, "name").lean(),
      Subject.find({ _id: { $in: subjectIds } }, "name").lean()
    ]);

    const classNameMap = Object.fromEntries(nameClasses.map(c => [c._id.toString(), c.name]));
    const subjectNameMap = Object.fromEntries(nameSubjects.map(s => [s._id.toString(), s.name]));

    formattedData.forEach(teacher => {
      const teacherId = teacher._id.toString();
      teacher.attendanceRecords.forEach(r => {
        if (!r.className) r.className = classNameMap[r.classId?.toString()] || "Unknown";
        if (!r.subjectName) r.subjectName = subjectNameMap[r.subjectId?.toString()] || "Unknown";
        // Join leaveReason from TeachersLeaveRecord
        const dateKey = getDS(r.date);
        const leaveKey = `${toStr(teacher._id)}_${toStr(r.classId)}_${r.periodNumber}_${dateKey}`;
        if (!r.leaveReason && leaveReasonMap[leaveKey]) {
          r.leaveReason = leaveReasonMap[leaveKey];
        }
      });
    });

    const paginatedData = limit === Infinity 
      ? formattedData 
      : formattedData.slice((page * limit), ((page + 1) * limit));

    return NextResponse.json(
      {
        teacherAttendances: paginatedData,
        pagination: {
          page,
          limit,
          total: formattedData.length,
          totalPages: limit === Infinity ? 1 : Math.ceil(formattedData.length / limit),
        },
        message: "Teacher attendance records synthesized successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching teacher attendances:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();

    const body = await req.json();

    // Validate required fields for manual teacher attendance creation
    const requiredFields = ["teacherId", "attendanceRecords"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Make sure each attendance record has a date
    for (const record of body.attendanceRecords) {
      if (!record.date) {
        return NextResponse.json(
          { message: "Each attendance record must have a date" },
          { status: 400 }
        );
      }
    }

    // Use findOneAndUpdate to atomically update in one operation
    const teacherAttendance = await TeacherAttendance.findOne({
      teacherId: body.teacherId,
    });

    if (teacherAttendance) {
      // Update existing records and add new ones in memory
      const updatedRecords = [...teacherAttendance.attendanceRecords];
      const newRecords = [];

      for (const newRecord of body.attendanceRecords) {
        // Convert dates to ISO strings for comparison
        const newRecordDateString = new Date(newRecord.date)
          .toISOString()
          .split("T")[0];

        const existingIndex = updatedRecords.findIndex(
          (existing) =>
            existing.classId.toString() === newRecord.classId.toString() &&
            existing.subjectId.toString() === newRecord.subjectId.toString() &&
            existing.periodNumber === newRecord.periodNumber &&
            existing.day === newRecord.day &&
            new Date(existing.date).toISOString().split("T")[0] ===
            newRecordDateString
        );

        if (existingIndex === -1) {
          // Add new record with current timestamp
          newRecords.push({
            ...newRecord,
            markedAt: new Date(),
          });
        } else {
          // Update existing record with new values and timestamp
          updatedRecords[existingIndex] = {
            ...updatedRecords[existingIndex],
            ...newRecord,
            markedAt: new Date(),
          };
        }
      }

      // Use updateOne to efficiently update the document
      await TeacherAttendance.updateOne(
        { teacherId: body.teacherId },
        {
          $set: { attendanceRecords: [...updatedRecords, ...newRecords] },
        }
      );

      // Return updated document
      const updated = await TeacherAttendance.findOne({
        teacherId: body.teacherId,
      });
      return NextResponse.json(
        {
          teacherAttendance: updated,
          message: "Teacher attendance updated successfully",
        },
        { status: 200 }
      );
    } else {
      // Create new record using insertOne for better performance
      const newAttendance = {
        teacherId: body.teacherId,
        attendanceRecords: body.attendanceRecords.map((record) => ({
          ...record,
          markedAt: new Date(),
        })),
      };

      const result = await TeacherAttendance.create(newAttendance);

      return NextResponse.json(
        {
          teacherAttendance: result,
          message: "Teacher attendance created successfully",
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error creating teacher attendance:", error);
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();

    const body = await req.json();
    const { teacherId, attendanceRecordIds, updates } = body;

    if (!teacherId || !attendanceRecordIds || !updates) {
      return NextResponse.json(
        { message: "teacherId, attendanceRecordIds, and updates are required" },
        { status: 400 }
      );
    }

    // Use array filter to update multiple records in one operation
    const updateOperations = attendanceRecordIds.map((id) => {
      return {
        "attendanceRecords.$[elem]": {
          ...updates,
          markedAt: new Date(),
        },
      };
    });

    // Use update with array filters for efficient updates
    const result = await TeacherAttendance.updateOne(
      { teacherId },
      { $set: updateOperations[0] },
      {
        arrayFilters: [{ "elem._id": { $in: attendanceRecordIds } }],
        new: true,
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Teacher attendance record not found" },
        { status: 404 }
      );
    }

    // Fetch the updated document
    const updatedAttendance = await TeacherAttendance.findOne({ teacherId })
      .populate("teacherId", "name")
      .populate("attendanceRecords.classId", "name")
      .populate("attendanceRecords.subjectId", "name");

    return NextResponse.json(
      {
        teacherAttendance: updatedAttendance,
        message: "Teacher attendance record updated successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating teacher attendance:", error);
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();

    const { teacherId, attendanceRecordIds } = await req.json();

    if (!teacherId || !attendanceRecordIds || !attendanceRecordIds.length) {
      return NextResponse.json(
        { message: "teacherId and attendanceRecordIds are required" },
        { status: 400 }
      );
    }

    // Use $pull operator to efficiently remove items from array
    const result = await TeacherAttendance.updateOne(
      { teacherId },
      {
        $pull: {
          attendanceRecords: {
            _id: { $in: attendanceRecordIds.map((id) => id.toString()) },
          },
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Teacher attendance record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: `Successfully deleted ${result.modifiedCount} attendance records`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting attendance records:", error);
    return apiResponse.error(error);
  }
}
