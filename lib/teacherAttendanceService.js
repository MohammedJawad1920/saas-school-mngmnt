import Attendance from "@/models/Attendance";
import TimeTable from "@/models/TimeTable";
import TeacherAttendance from "@/models/TeacherAttendance";

// Helper to get YYYY-MM-DD from a Date object using Local Time (to avoid UTC shift bugs)
const getLocalDS = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Automatically marks teacher attendance when they create a student attendance record
 * This function should be called after creating a new student attendance record
 * @param {Object} studentAttendance - The student attendance record that was created
 * @returns {Promise<Object>} The created or updated teacher attendance record
 */
export const markTeacherAttendanceFromStudentAttendance = async (
  studentAttendance
) => {
  try {
    const { teacherId, date, classId, batchId, subjectId, periodNumber, day } =
      studentAttendance;

    // Find teacher attendance record
    let teacherAttendance = await TeacherAttendance.findOne({
      teacherId,
    });

    if (!teacherAttendance) {
      teacherAttendance = new TeacherAttendance({
        teacherId,
        attendanceRecords: [],
      });
    }

    // Check if this period is already recorded for this date
    const dateStr = getLocalDS(date);
    const existingRecordIndex = teacherAttendance.attendanceRecords.findIndex(
      (record) =>
        String(record.classId) === String(classId) &&
        String(record.subjectId) === String(subjectId) &&
        Number(record.periodNumber) === Number(periodNumber) &&
        getLocalDS(record.date) === dateStr
    );

    // If found, update it, otherwise add new record
    const newRecord = {
      classId,
      batchId,
      subjectId,
      periodNumber,
      day,
      date: new Date(date),
      present: true,
      autoMarked: true,
      markedAt: new Date(),
    };

    if (existingRecordIndex >= 0) {
      teacherAttendance.attendanceRecords[existingRecordIndex] = {
        ...(teacherAttendance.attendanceRecords[existingRecordIndex].toObject?.() || 
           teacherAttendance.attendanceRecords[existingRecordIndex]),
        ...newRecord,
      };
    } else {
      teacherAttendance.attendanceRecords.push(newRecord);
    }

    // Explicitly mark as modified so Mongoose tracks the array change
    teacherAttendance.markModified("attendanceRecords");
    await teacherAttendance.save();
    return teacherAttendance;
  } catch (error) {
    console.error("Error marking teacher attendance:", error);
    throw error;
  }
};

/**
 * Synchronizes teacher attendance based on the current state of student attendance.
 * If at least one student is marked present, the teacher is marked present.
 * If all students are absent (a reset state), the teacher is marked absent.
 */
export const syncTeacherAttendanceFromStudentAttendance = async (
  studentAttendance
) => {
  try {
    const { teacherId, date, classId, batchId, subjectId, periodNumber, day, attendanceData } =
      studentAttendance;

    // Determine if any student is present
    const isAnyPresent = (attendanceData || []).some(s => s.present === true);

    if (isAnyPresent) {
      // Mark teacher as present
      return await markTeacherAttendanceFromStudentAttendance(studentAttendance);
    } else {
      // Transition teacher to absent (Reset/Clear state)
      return await unmarkTeacherAttendanceFromStudentAttendance(studentAttendance);
    }
  } catch (error) {
    console.error("Error syncing teacher attendance:", error);
    throw error;
  }
};

/**
 * Resets teacher attendance back to absent when student attendance is deleted (reset)
 * @param {Object} studentAttendance - The student attendance record that was deleted
 * @returns {Promise<Object|null>} The updated teacher attendance record
 */
export const unmarkTeacherAttendanceFromStudentAttendance = async (
  studentAttendance
) => {
  try {
    const { teacherId, date, classId, batchId, subjectId, periodNumber } =
      studentAttendance;

    const teacherAttendance = await TeacherAttendance.findOne({ 
      teacherId: teacherId.toString() 
    });

    if (!teacherAttendance) return null;

    const dateStr = getLocalDS(date);
    const initialCount = teacherAttendance.attendanceRecords.length;

    // Filter out the specific record entirely using aggressive string-based ID matching
    // This handles cases where some records might store ObjectIds and others Strings.
    teacherAttendance.attendanceRecords = teacherAttendance.attendanceRecords.filter(r => {
      const rDateStr = getLocalDS(r.date);
      const match = rDateStr === dateStr &&
                  String(r.classId || "") === String(classId || "") &&
                  String(r.subjectId || "") === String(subjectId || "") &&
                  Number(r.periodNumber) === Number(periodNumber);
      return !match;
    });

    if (teacherAttendance.attendanceRecords.length < initialCount) {
      // Explicitly mark as modified so Mongoose tracks the array change
      teacherAttendance.markModified("attendanceRecords");
      await teacherAttendance.save();
      console.log(`Unmark: Successfully removed record for ${teacherId} on ${dateStr}`);
    }

    return teacherAttendance;
  } catch (error) {
    console.error("Error unmarkTeacherAttendanceFromStudentAttendance:", error);
    throw error;
  }
};

/**
 * Automatically mark teachers as absent for all classes where attendance wasn't taken
 * This function should be scheduled to run at the end of each day
 * @param {String} date - The date to check for absences (YYYY-MM-DD)
 * @returns {Promise<Object>} Result of the operation
 */

export const markAbsentTeachers = async (date) => {
  try {
    // Get day of the week from date
    const dayObj = new Date(date);
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const day = days[dayObj.getDay()];
    console.log(`Processing day: ${day}, date: ${date}`);

    // Format date string once for comparison
    const dateToCompare = new Date(date).toISOString().split("T")[0];

    // 1. Get all relevant timetables with minimal projection and lean query
    const timeTables = await TimeTable.find(
      { "timeSlots.day": day },
      { timeSlots: 1, classId: 1 }
    )
      .populate("classId", "batchId")
      .lean(); // Using lean() for better performance

    console.log(`Found ${timeTables.length} timetables for ${day}`);

    if (timeTables.length === 0) {
      return {
        success: true,
        message: "No timetables found for this day",
        processedCount: 0,
        date,
        day,
      };
    }

    // 2. Extract all potential attendance entries more efficiently
    const teacherEntries = {};

    for (const timeTable of timeTables) {
      if (!timeTable.classId) continue;

      const classId = timeTable.classId._id;
      const batchId = timeTable.classId.batchId;

      for (const slot of timeTable.timeSlots) {
        if (slot.day !== day || !slot.teacherId || !slot.subjectId) continue;

        const teacherId = slot.teacherId.toString();

        // Group by teacherId for bulk processing
        if (!teacherEntries[teacherId]) {
          teacherEntries[teacherId] = [];
        }

        teacherEntries[teacherId].push({
          classId,
          batchId,
          subjectId: slot.subjectId,
          periodNumber: slot.periodNumber,
          day,
          date: new Date(date),
        });
      }
    }

    const teacherIds = Object.keys(teacherEntries);
    console.log(`Processing attendance for ${teacherIds.length} teachers`);

    if (teacherIds.length === 0) {
      return {
        success: true,
        message: "No teacher schedules found for this day",
        processedCount: 0,
        date,
        day,
      };
    }

    // 3. Fetch all existing teacher attendance records at once
    const existingRecords = await TeacherAttendance.find({
      teacherId: { $in: teacherIds },
    }).lean();

    const existingRecordsMap = {};
    existingRecords.forEach((record) => {
      existingRecordsMap[record.teacherId] = record;
    });

    // 4. Prepare bulk operations for better performance
    const bulkOps = [];
    const now = new Date();

    for (const teacherId of teacherIds) {
      const entries = teacherEntries[teacherId];
      const existingRecord = existingRecordsMap[teacherId];

      if (existingRecord) {
        // For existing records, we'll use updateOne
        const existingAttendanceMap = new Map();

        // Create a map of existing attendance records for quick lookup
        if (
          existingRecord.attendanceRecords &&
          existingRecord.attendanceRecords.length > 0
        ) {
          existingRecord.attendanceRecords.forEach((record) => {
            if (
              new Date(record.date).toISOString().split("T")[0] ===
              dateToCompare
            ) {
              const key = `${record.classId}-${record.subjectId}-${record.periodNumber}`;
              existingAttendanceMap.set(key, true);
            }
          });
        }

        // Filter only new entries
        const newEntries = entries.filter((entry) => {
          const key = `${entry.classId}-${entry.subjectId}-${entry.periodNumber}`;
          return !existingAttendanceMap.has(key);
        });

        if (newEntries.length > 0) {
          // Add the new attendance records
          const newAttendanceRecords = newEntries.map((entry) => ({
            classId: entry.classId,
            batchId: entry.batchId,
            subjectId: entry.subjectId,
            periodNumber: entry.periodNumber,
            day,
            date: entry.date,
            present: false,
            autoMarked: true,
            markedAt: now,
          }));

          bulkOps.push({
            updateOne: {
              filter: { teacherId },
              update: {
                $push: {
                  attendanceRecords: { $each: newAttendanceRecords },
                },
              },
            },
          });
        }
      } else {
        // For new teachers, create a new document
        const newAttendanceRecords = entries.map((entry) => ({
          classId: entry.classId,
          batchId: entry.batchId,
          subjectId: entry.subjectId,
          periodNumber: entry.periodNumber,
          day,
          date: entry.date,
          present: false,
          autoMarked: true,
          markedAt: now,
        }));

        bulkOps.push({
          insertOne: {
            document: {
              teacherId,
              attendanceRecords: newAttendanceRecords,
              createdAt: now,
              updatedAt: now,
            },
          },
        });
      }
    }

    // 5. Execute bulk operations if any
    if (bulkOps.length > 0) {
      console.log(`Executing ${bulkOps.length} bulk operations`);
      await TeacherAttendance.bulkWrite(bulkOps, { ordered: false });
    } else {
      console.log("No new attendance records to add");
    }

    return {
      success: true,
      message: "Absent teachers marked successfully",
      processedCount: teacherIds.length,
      operationsCount: bulkOps.length,
      date,
      day,
    };
  } catch (error) {
    console.error("Error marking absent teachers:", error);
    throw error;
  }
};

/**
 * Get teacher attendance statistics for a given period
 * @param {String} teacherId - The teacher's ID
 * @param {String} startDate - Start date for statistics (YYYY-MM-DD)
 * @param {String} endDate - End date for statistics (YYYY-MM-DD)
 * @returns {Promise<Object>} Attendance statistics
 */
export const getTeacherAttendanceStats = async (
  teacherId,
  startDate,
  endDate
) => {
  try {
    const teacherAttendance = await TeacherAttendance.findOne({
      teacherId,
    });

    if (!teacherAttendance) {
      return {
        teacherId,
        period: { startDate, endDate },
        totalClasses: 0,
        presentClasses: 0,
        absentClasses: 0,
        attendancePercentage: 0,
      };
    }

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    const relevantRecords = teacherAttendance.attendanceRecords.filter(
      (record) => {
        const recordDate = new Date(record.date);
        return recordDate >= start && recordDate <= end;
      }
    );

    const totalClasses = relevantRecords.length;
    const presentClasses = relevantRecords.filter((r) => r.present).length;
    const absentClasses = totalClasses - presentClasses;

    const attendancePercentage =
      totalClasses > 0 ? ((presentClasses / totalClasses) * 100).toFixed(2) : 0;

    return {
      teacherId,
      period: { startDate, endDate },
      totalClasses,
      presentClasses,
      absentClasses,
      attendancePercentage: parseFloat(attendancePercentage),
    };
  } catch (error) {
    console.error("Error getting teacher attendance stats:", error);
    throw error;
  }
};
