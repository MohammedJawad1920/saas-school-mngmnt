import { NextResponse } from "next/server";
import { headers } from "next/headers";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import LiteraryAttendance from "@/models/LiteraryAttendance";
import LiteraryGroup from "@/models/LiteraryGroup";
import LeaveRecord from "@/models/LeaveRecord";

// Helper to validate User via x-user-id header
async function validateUser(request) {
    const userId = request.headers.get("x-user-id");
    if (!userId) return null;

    await connectToDB();
    const user = await User.findOne({ _id: userId });
    return user;
}

export async function GET(request) {
    try {
        const user = await validateUser(request);
        if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category"); // "ALL", "GROUP", or "BOTH"
        const categoryId = searchParams.get("categoryId"); // always a classId
        const startDateStr = searchParams.get("startDate");
        const endDateStr = searchParams.get("endDate");

        if (!category || !categoryId || !startDateStr || !endDateStr) {
            return NextResponse.json({ message: "Missing required params" }, { status: 400 });
        }

        const startDate = new Date(startDateStr);
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(endDateStr);
        endDate.setHours(23, 59, 59, 999);

        // 1. Fetch Students depending on category
        let students = [];
        if (category === "ALL") {
            students = await User.find({
                $or: [
                    { "studentSpecificField.classId": categoryId },
                    { "studentSpecificField.subjectTypeAssignments": { 
                        $in: [`${categoryId}:CORE`, `${categoryId}:MAJOR`] 
                      } 
                    }
                ],
                "studentSpecificField.status": "Active",
                roles: "Student",
            }).select("name _id studentSpecificField.batchId").sort({ _id: 1 });
        } else if (category === "GROUP" || category === "BOTH") {
            students = await User.find({
                $or: [
                    { "studentSpecificField.classId": categoryId },
                    { "studentSpecificField.subjectTypeAssignments": { 
                        $in: [`${categoryId}:CORE`, `${categoryId}:MAJOR`] 
                      } 
                    }
                ],
                "studentSpecificField.status": "Active",
                roles: "Student",
            }).select("name _id").sort({ _id: 1 });
        }

        const studentIds = students.map(s => s._id.toString());

        // 2. Fetch LiteraryAttendance Records for the range
        const attendanceQuery = {
            date: { $gte: startDate, $lte: endDate },
        };

        let attendanceRecords = [];

        if (category === "ALL") {
            attendanceQuery.category = "ALL";
            attendanceQuery.classId = categoryId;
            attendanceRecords = await LiteraryAttendance.find(attendanceQuery);
        } else if (category === "GROUP") {
            attendanceQuery.category = "GROUP";
            attendanceQuery["attendanceData.studentId"] = { $in: studentIds };
            attendanceRecords = await LiteraryAttendance.find(attendanceQuery);
        } else if (category === "BOTH") {
            attendanceQuery.category = { $in: ["ALL", "GROUP"] };
            attendanceQuery["attendanceData.studentId"] = { $in: studentIds };
            attendanceRecords = await LiteraryAttendance.find(attendanceQuery);
        }

        // 2.5 Fetch Leave Records for the range
        // Since LiteraryAttendance applies to students, and leave is normally against Class or globally
        // Let's fetch leaves for the specific students found earlier because we don't have a single classId if it's a Group.
        const leaveRecords = await LeaveRecord.find({
            studentId: { $in: studentIds },
            dateOfLeave: { $lte: endDate },
            $or: [
                { dateOfArrival: { $gte: startDate } },
                { arrivedDate: { $gte: startDate } } // Treating open leaves
            ]
        });

        // 3. Transform DataMap
        // Map: studentId -> { "YYYY-MM-DD": { present: bool, markedBy: string, markedAt: date } }
        const attendanceMap = {};
        const leavesMap = {}; // studentId -> { "YYYY-MM-DD": reason }

        attendanceRecords.forEach((record) => {
            const dateStr = record.date.toISOString().split("T")[0]; // YYYY-MM-DD

            record.attendanceData.forEach((entry) => {
                // Since GROUP and BOTH categories match via studentIds, filter safely
                if (!studentIds.includes(entry.studentId.toString())) return;

                if (!attendanceMap[entry.studentId]) {
                    attendanceMap[entry.studentId] = {};
                }

                attendanceMap[entry.studentId][dateStr] = {
                    present: entry.present,
                    markedBy: "Literary Leader",
                    markedAt: record.updatedAt || record.createdAt,
                    recordId: record._id
                };
            });
        });

        // Process Leaves
        leaveRecords.forEach(leave => {
            const start = leave.dateOfLeave < startDate ? startDate : leave.dateOfLeave;
            const end = (leave.dateOfArrival && leave.dateOfArrival < endDate) ? leave.dateOfArrival : endDate;
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                // Ensure the day falls within the requested range
                if (d >= startDate && d <= endDate) {
                    const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
                    if (!leavesMap[leave.studentId]) leavesMap[leave.studentId] = {};
                    leavesMap[leave.studentId][dateStr] = leave.leaveReason;
                }
            }
        });

        return NextResponse.json({
            students,
            attendanceMap,
            leavesMap
        });

    } catch (error) {
        console.error("Literary Attendance Sheet API Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
