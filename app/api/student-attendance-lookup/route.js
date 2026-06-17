import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import StudentAttendance from "@/models/StudentAttendance";
import Attendance from "@/models/Attendance";
import LeaveRecord from "@/models/LeaveRecord";

export async function GET(req) {
    try {
        await connectToDB();

        const url = new URL(req.url);
        const studentId = url.searchParams.get("studentId");
        const month = parseInt(url.searchParams.get("month"));
        const year = parseInt(url.searchParams.get("year"));

        if (!studentId) {
            return NextResponse.json(
                { message: "studentId is required" },
                { status: 400 }
            );
        }

        // Build date range for filtering
        let startDate = null;
        let endDate = null;
        if (month && year) {
            startDate = new Date(year, month - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(year, month, 0);
            endDate.setHours(23, 59, 59, 999);
        } else if (year) {
            startDate = new Date(year, 0, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(year, 11, 31);
            endDate.setHours(23, 59, 59, 999);
        }

        // ── Primary source: StudentAttendance (same as history table) ─────────
        const studentDoc = await StudentAttendance.findOne({ studentId })
            .populate({ path: "attendanceRecords.classId", select: "name" })
            .populate({ path: "attendanceRecords.subjectId", select: "name" })
            .lean();

        if (!studentDoc) {
            return NextResponse.json({ records: [] }, { status: 200 });
        }

        // Filter attendanceRecords by date range (mirrors history table filter logic)
        let filteredRecords = studentDoc.attendanceRecords || [];
        if (startDate && endDate) {
            filteredRecords = filteredRecords.filter((rec) => {
                const d = new Date(rec.date);
                return d >= startDate && d <= endDate;
            });
        }

        // Sort descending by date (most recent first)
        filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        // ── Secondary: look up teacher names from Attendance (best-effort) ────
        // Build a map keyed by "classId|subjectId|periodNumber|date(date-only)"
        let teacherMap = {};
        if (filteredRecords.length > 0) {
            const dateFilter = startDate && endDate
                ? { date: { $gte: startDate, $lte: endDate } }
                : {};

            const attendanceDocs = await Attendance.find({
                "attendanceData.studentId": studentId,
                ...dateFilter,
            })
                .populate({ path: "teacherId", select: "name" })
                .lean();

            attendanceDocs.forEach((att) => {
                const dateKey = new Date(att.date).toISOString().split("T")[0];
                const key = `${att.classId}|${att.subjectId}|${att.periodNumber}|${dateKey}`;
                teacherMap[key] = att.teacherId?.name || "—";
            });
        }

        // ── Join leaveReason from LeaveRecord ─────────────────────────────────
        // Helper: normalize any date to a local YYYY-MM-DD string
        const toDateKey = (d) => {
            const dt = new Date(d);
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, "0");
            const day = String(dt.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };

        let leaveReasonMap = {}; // keyed by local "YYYY-MM-DD" -> leaveReason
        const absentRecords = filteredRecords.filter(r => r.present === false);

        if (absentRecords.length > 0) {
            // Expand date range by 1 day on each side to avoid timezone boundary issues
            const absentTimes = absentRecords.map(r => new Date(r.date).getTime());
            const minDate = new Date(Math.min(...absentTimes));
            const maxDate = new Date(Math.max(...absentTimes));
            minDate.setHours(0, 0, 0, 0);
            maxDate.setHours(23, 59, 59, 999);

            const leaveRecords = await LeaveRecord.find({
                studentId,
                dateOfLeave: { $lte: maxDate },
            }, "dateOfLeave dateOfArrival arrivedDate leaveReason").lean();

            // For each absent record, find the most recent leave record that applies
            absentRecords.forEach(rec => {
                const absDateKey = toDateKey(rec.date);
                if (leaveReasonMap[absDateKey]) return; // already matched

                // Filter leave records that started on or before this absence
                // and where the student hadn't yet returned (no arrivedDate or arrivedDate > absence)
                const relevantLeaves = leaveRecords.filter(lr => {
                    const fromKey = toDateKey(lr.dateOfLeave);
                    const arrivedKey = lr.arrivedDate ? toDateKey(lr.arrivedDate) : null;
                    
                    return absDateKey >= fromKey && (!arrivedKey || arrivedKey > absDateKey);
                });

                if (relevantLeaves.length > 0) {
                    // Sort by dateOfLeave descending to get the most recent one
                    relevantLeaves.sort((a, b) => new Date(b.dateOfLeave) - new Date(a.dateOfLeave));
                    leaveReasonMap[absDateKey] = relevantLeaves[0].leaveReason;
                }
            });
        }

        // Map to the dialog's expected shape
        const records = filteredRecords.map((rec) => {
            const classId = rec.classId?._id || rec.classId;
            const subjectId = rec.subjectId?._id || rec.subjectId;
            const dateKey = toDateKey(rec.date);
            const key = `${classId}|${subjectId}|${rec.periodNumber}|${dateKey}`;

            return {
                date: rec.date,
                subjectName: rec.subjectId?.name || "—",
                teacherName: teacherMap[key] || "—",
                className: rec.classId?.name || "—",
                periodNumber: rec.periodNumber,
                present: rec.present ?? null,
                leaveReason: leaveReasonMap[dateKey] || null,
            };
        });

        return NextResponse.json({ records }, { status: 200 });
    } catch (error) {
        console.error("student-attendance-lookup error:", error);
        return NextResponse.json(
            { message: "Internal Server Error", error: error.message },
            { status: 500 }
        );
    }
}
