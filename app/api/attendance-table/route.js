import { NextResponse } from 'next/server';
import connectToDB from '@/lib/db';
import Attendance from '@/models/Attendance.js';
import TimeTable from '@/models/TimeTable.js';
import TeachersLeaveRecord from '@/models/TeachersLeaveRecord.js';
import Class from '@/models/Class.js';

export async function GET(req) {
  try {
    await connectToDB();

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const month = parseInt(searchParams.get('month'));
    const year = parseInt(searchParams.get('year'));

    // Helper to get YYYY-MM-DD in local time
    const formatDate = (date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (!classId || !month || !year) {
      return NextResponse.json(
        { message: 'classId, month, and year are required' },
        { status: 400 }
      );
    }

    // 1. Fetch TimeTable for the class to get all subject-teacher pairs
    const timeTables = await TimeTable.find({ classId })
      .populate({
        path: 'timeSlots.subjectId',
        select: 'name',
      })
      .populate({
        path: 'timeSlots.teacherId',
        select: 'name',
      });

    // Extract unique subject-teacher pairs with schedule info
    const subjectTeacherPairs = {};
    const dayScheduleMap = {}; // day -> subjectId-teacherId -> [periodNumbers]

    if (timeTables) {
      timeTables.forEach((tt) => {
        tt.timeSlots.forEach((slot) => {
          if (slot.subjectId && slot.teacherId) {
            const sid = slot.subjectId._id.toString();
            const tid = slot.teacherId._id.toString();
            const key = `${sid}-${tid}`;

            // Store subject-teacher info
            if (!subjectTeacherPairs[key]) {
              subjectTeacherPairs[key] = {
                subjectId: sid,
                subjectName: slot.subjectId.name,
                teacherId: tid,
                teacherName: slot.teacherId.name,
              };
            }

            // Store schedule by day
            if (!dayScheduleMap[slot.day]) {
              dayScheduleMap[slot.day] = {};
            }
            if (!dayScheduleMap[slot.day][key]) {
              dayScheduleMap[slot.day][key] = [];
            }
            dayScheduleMap[slot.day][key].push(slot.periodNumber);
          }
        });
      });
    }

    // Derive final unique pairs after harvesting from attendances

    // 2. Fetch marked attendances for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendances = await Attendance.find({
      classId,
      date: { $gte: startDate, $lte: endDate },
    })
      .populate({
        path: 'subjectId',
        select: 'name',
      })
      .populate({
        path: 'teacherId',
        select: 'name',
      });

    // Extract unique subject-teacher pairs from Attendances as well
    // AND Reconstruct historical schedule patterns
    const historicalDayScheduleMap = {}; // dayName -> accessor -> [periodNumbers]
    
    attendances.forEach((att) => {
      if (att.subjectId && att.teacherId) {
        const sid = att.subjectId._id.toString();
        const tid = att.teacherId._id.toString();
        const accessor = `${sid}-${tid}`;

        // 1. Ensure pair exists in uniquePairs
        if (!subjectTeacherPairs[accessor]) {
          subjectTeacherPairs[accessor] = {
            subjectId: sid,
            subjectName: att.subjectId.name,
            teacherId: tid,
            teacherName: att.teacherId.name,
          };
        }

        // 2. Map historical schedule
        const dName = new Date(att.date).toLocaleDateString('en-US', { weekday: 'long' });
        if (!historicalDayScheduleMap[dName]) historicalDayScheduleMap[dName] = {};
        if (!historicalDayScheduleMap[dName][accessor]) historicalDayScheduleMap[dName][accessor] = [];
        if (!historicalDayScheduleMap[dName][accessor].includes(att.periodNumber)) {
          historicalDayScheduleMap[dName][accessor].push(att.periodNumber);
        }
      }
    });

    const classInfo = await Class.findById(classId).lean();
    const coreSubjects = classInfo?.coreSubjects?.map(s => s.toString()) || [];
    const majorSubjects = classInfo?.majorSubjects?.map(s => s.toString()) || [];

    const uniquePairs = Object.values(subjectTeacherPairs).sort((a, b) => {
      const aIsCore = coreSubjects.includes(a.subjectId);
      const bIsCore = coreSubjects.includes(b.subjectId);
      const aIsMajor = majorSubjects.includes(a.subjectId);
      const bIsMajor = majorSubjects.includes(b.subjectId);

      if (aIsCore && !bIsCore) return -1;
      if (!aIsCore && bIsCore) return 1;

      if (aIsMajor && !bIsMajor) return 1;
      if (!aIsMajor && bIsMajor) return -1;

      return a.subjectName.localeCompare(b.subjectName);
    });

    // Create lookup set: date-subjectId-teacherId
    const markedAttendances = new Set();
    attendances.forEach((att) => {
      if (att.subjectId && att.teacherId) {
        const isoDate = formatDate(att.date);
        const key = `${isoDate}-${att.subjectId._id.toString()}-${att.teacherId._id.toString()}`;
        markedAttendances.add(key);
      }
    });

    // 3. Fetch teacher leave records for the month
    const leaveRecords = await TeachersLeaveRecord.find({
      classId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Create leave lookup: date-teacherId-periodNumber -> leaveReason
    const leaveMap = {};
    leaveRecords.forEach((leave) => {
      const isoDate = formatDate(leave.date);
      const key = `${isoDate}-${leave.teacherId}-${leave.periodNumber}`;
      leaveMap[key] = leave.leaveReason;
    });

    // 4. Create columns for the table
    const columns = [
      { Header: 'Date', accessor: 'date' },
      ...uniquePairs.map((pair) => ({
        Header: `${pair.subjectName}\n(${pair.teacherName})`,
        accessor: `${pair.subjectId}-${pair.teacherId}`,
        subjectId: pair.subjectId,
        teacherId: pair.teacherId,
        subjectName: pair.subjectName,
        teacherName: pair.teacherName,
      })),
    ];

    // 5. Create table data with status indicators
    const daysInMonth = endDate.getDate();
    const dates = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tableData = dates.map((date) => {
      const isoDate = formatDate(date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const isUpcoming = date > today;

      const row = {
        date: isoDate,
        dayName: dayName,
        displayDate: `${date.getDate()} ${date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}`,
      };

      uniquePairs.forEach((pair) => {
        const accessor = `${pair.subjectId}-${pair.teacherId}`;
        const attendanceLookupKey = `${isoDate}-${pair.subjectId}-${pair.teacherId}`;

        // Check for schedule in both current timetable and historical patterns
        const currentPeriods = (dayScheduleMap[dayName] && dayScheduleMap[dayName][accessor]) || [];
        const historicalPeriods = (historicalDayScheduleMap[dayName] && historicalDayScheduleMap[dayName][accessor]) || [];
        
        // Merge periods to identify if it "should" have been marked
        const scheduledPeriods = Array.from(new Set([...currentPeriods, ...historicalPeriods]));

        // If it's an upcoming day
        if (isUpcoming) {
          if (scheduledPeriods.length > 0) {
            row[accessor] = {
              status: 'UPCOMING_PERIOD',
              message: 'Upcoming',
            };
          } else {
            row[accessor] = {
              status: 'NO_PERIOD',
              message: 'No Period',
            };
          }
          return;
        }

        if (scheduledPeriods.length === 0) {
          // No record of this subject on this day, BUT check if it was marked anyway (Ad-hoc marking)
          if (markedAttendances.has(attendanceLookupKey)) {
            row[accessor] = {
              status: 'MARKED',
              message: '✓ Marked',
            };
          } else {
             row[accessor] = {
              status: 'NO_PERIOD',
              message: 'No Period',
            };
          }
        } else {
          // Has period(s) scheduled (historically or currently)
          // 1. Check for leave (can be checked for any of the scheduled periods)
          const leavePeriod = scheduledPeriods.find((periodNum) => {
            const leaveKey = `${isoDate}-${pair.teacherId}-${periodNum}`;
            return leaveMap[leaveKey];
          });

          if (leavePeriod) {
            const leaveKey = `${isoDate}-${pair.teacherId}-${leavePeriod}`;
            row[accessor] = {
              status: 'LEAVE',
              message: leaveMap[leaveKey],
              leaveReason: leaveMap[leaveKey],
            };
          } else if (markedAttendances.has(attendanceLookupKey)) {
            // 2. Attendance marked
            row[accessor] = {
              status: 'MARKED',
              message: '✓ Marked',
            };
          } else {
            // 3. Period exists but attendance not marked -> Absent (only for past/current dates)
            row[accessor] = {
              status: 'NOT_MARKED',
              message: '✗ Not Marked',
            };
          }
        }
      });

      return row;
    });

    return NextResponse.json({ tableData, columns });
  } catch (error) {
    console.error('Error in /api/attendance-table:', error);
    return NextResponse.json(
      { message: 'Internal Server Error', error: error.message },
      { status: 500 }
    );
  }
}
