import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Attendance from "@/models/Attendance";
import TeachersLeaveRecord from "@/models/TeachersLeaveRecord";
import TimeTable from "@/models/TimeTable";
import Settings from "@/models/Settings";
import Class from "@/models/Class";
import Subject from "@/models/Subject";
import { models } from "mongoose";

// Helper to get consistent YYYY-MM-DD
const getDS = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export async function GET(req) {
    try {
        await connectToDB();

        const url = new URL(req.url);
        const teacherId = url.searchParams.get("teacherId");
        const monthParam = parseInt(url.searchParams.get("month"));
        const yearParam = parseInt(url.searchParams.get("year"));

        if (!teacherId) {
            return NextResponse.json({ message: "teacherId is required" }, { status: 400 });
        }

        // 1. Determine Date Range
        let startDate = null;
        let endDate = null;
        if (monthParam && yearParam) {
            startDate = new Date(Date.UTC(yearParam, monthParam - 1, 1));
            endDate = new Date(Date.UTC(yearParam, monthParam, 0, 23, 59, 59, 999));
        } else if (yearParam) {
            startDate = new Date(Date.UTC(yearParam, 0, 1));
            endDate = new Date(Date.UTC(yearParam, 11, 31, 23, 59, 59, 999));
        } else {
            // Default to current month if nothing provided
            const now = new Date();
            startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
            endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
        }

        // 2. Fetch dependencies
        const [timeTables, settings, holidays, markedAttendance] = await Promise.all([
            TimeTable.find({ "timeSlots.teacherId": teacherId }).lean(),
            Settings.findOne({}).lean(),
            models.AcademicCalendar ? models.AcademicCalendar.find({
                date: { $gte: startDate, $lte: endDate },
                type: "Holiday"
            }).lean() : [],
            Attendance.find({
                teacherId,
                date: { $gte: startDate, $lte: endDate }
            }).populate({ path: "classId", select: "name" })
              .populate({ path: "subjectId", select: "name" })
              .lean()
        ]);

        // 3. Pre-process data for synthesis
        const holidayMap = new Map();
        holidays.forEach(h => holidayMap.set(getDS(h.date), true));

        const isTodayGlobalWorking = settings?.general?.isWorkingDay !== false;
        const todayDS = getDS(new Date());

        const scheduleSlots = [];
        timeTables.forEach(tt => {
            (tt.timeSlots || []).forEach(slot => {
                if (String(slot.teacherId) === teacherId) {
                    scheduleSlots.push({
                        classId: tt.classId,
                        subjectId: slot.subjectId,
                        periodNumber: slot.periodNumber,
                        day: slot.day,
                        validFrom: slot.validFrom || tt.updatedAt || tt.createdAt,
                        validTo: slot.validTo
                    });
                }
            });
        });

        const markedMap = new Map();
        markedAttendance.forEach(att => {
            const dateKey = getDS(att.date);
            const key = `${dateKey}_${String(att.classId?._id || att.classId)}_${String(att.subjectId?._id || att.subjectId)}_${att.periodNumber}`;
            markedMap.set(key, att);
        });

        // 4. Synthesis
        const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const records = [];
        const processedKeys = new Set();

        let curr = new Date(startDate);
        while (curr <= endDate) {
            const dateDS = getDS(curr);
            const dayName = WEEKDAYS[curr.getUTCDay()];
            
            const isHoliday = holidayMap.has(dateDS);
            const isImplicitHoliday = (dateDS >= "2026-04-01" && dateDS <= "2026-04-10") || (dateDS >= "2026-05-25" && dateDS <= "2026-06-05") || (dateDS >= "2026-02-12" && dateDS <= "2026-02-28"); // Mirror main API logic
            const isWorkingDay = !isHoliday && !isImplicitHoliday && isTodayGlobalWorking;

            scheduleSlots.forEach(slot => {
                if (slot.day !== dayName) return;

                const key = `${dateDS}_${String(slot.classId)}_${String(slot.subjectId)}_${slot.periodNumber}`;
                if (processedKeys.has(key)) return;
                processedKeys.add(key);

                const actual = markedMap.get(key);
                const validFromDS = slot.validFrom ? getDS(slot.validFrom) : null;
                const validToDS = slot.validTo ? getDS(slot.validTo) : null;

                if (actual) {
                    records.push({
                        date: actual.date,
                        classId: String(actual.classId?._id || actual.classId || slot.classId),
                        subjectId: String(actual.subjectId?._id || actual.subjectId || slot.subjectId),
                        subjectName: actual.subjectId?.name || "Unknown",
                        className: actual.classId?.name || "Unknown",
                        periodNumber: actual.periodNumber,
                        present: true,
                        synthetic: false
                    });
                } else if (isWorkingDay && dateDS <= todayDS && (!validFromDS || dateDS >= validFromDS) && (!validToDS || dateDS < validToDS)) {
                    // This is an "Absent" record (scheduled but not marked)
                    records.push({
                        date: new Date(curr),
                        classId: slot.classId,
                        subjectId: slot.subjectId,
                        periodNumber: slot.periodNumber,
                        present: false,
                        synthetic: true
                    });
                }
            });

            curr.setUTCDate(curr.getUTCDate() + 1);
        }

        // 5. Populate names for synthetic records
        const missingClassIds = [...new Set(records.filter(r => r.synthetic).map(r => String(r.classId)))];
        const missingSubIds = [...new Set(records.filter(r => r.synthetic).map(r => String(r.subjectId)))];

        const [classes, subjects] = await Promise.all([
            Class.find({ _id: { $in: missingClassIds } }, "name").lean(),
            Subject.find({ _id: { $in: missingSubIds } }, "name").lean()
        ]);

        const classMap = Object.fromEntries(classes.map(c => [String(c._id), c.name]));
        const subjectMap = Object.fromEntries(subjects.map(s => [String(s._id), s.name]));

        records.forEach(r => {
            if (r.synthetic) {
                r.className = classMap[String(r.classId)] || "Unknown";
                r.subjectName = subjectMap[String(r.subjectId)] || "Unknown";
            }
        });

        // 6. Join leaveReason from TeachersLeaveRecord
        const leaveRecordDocs = await TeachersLeaveRecord.find({
            teacherId,
            date: { $gte: startDate, $lte: endDate },
        }, "classId periodNumber date leaveReason").lean();

        const toStr = (v) => (v?._id || v || "").toString().trim();

        const leaveMap = {};
        leaveRecordDocs.forEach(lr => {
            const dateKey = getDS(lr.date);
            const key = `${toStr(lr.classId)}_${lr.periodNumber}_${dateKey}`;
            if (lr.leaveReason) leaveMap[key] = lr.leaveReason;
        });

        records.forEach(r => {
            const dateKey = getDS(r.date);
            const key = `${toStr(r.classId)}_${r.periodNumber}_${dateKey}`;
            if (!r.leaveReason && leaveMap[key]) {
                r.leaveReason = leaveMap[key];
            }
        });

        // Final sort
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        return NextResponse.json({ records }, { status: 200 });

    } catch (error) {
        console.error("teacher-attendance-lookup error:", error);
        return NextResponse.json(
            { message: "Internal Server Error", error: error.message },
            { status: 500 }
        );
    }
}
