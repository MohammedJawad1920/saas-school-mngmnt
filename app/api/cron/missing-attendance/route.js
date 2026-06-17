import { NextResponse } from "next/server";
import webpush from "web-push";
import connectToDB from "@/lib/db";
import TimeTable from "@/models/TimeTable";
import Attendance from "@/models/Attendance";
import User from "@/models/User";
import Class from "@/models/Class";
import Subject from "@/models/Subject";

export async function GET(req) {
  try {
    webpush.setVapidDetails(
      "mailto:admin@scofist.com",
      process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    // 1. Verify cron secret
    const { searchParams } = new URL(req.url);
    const cronSecret = searchParams.get("cronSecret");
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();

    // 2. Get today's day of week and date boundaries
    const today = new Date();
    // Use IST timezone for day checking since the school operates in IST
    const formatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata",
    });
    const todayDay = formatter.format(today); // e.g., "Monday"

    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // 3. Fetch timetables that have slots for today
    const timeTables = await TimeTable.find({
      "timeSlots.day": todayDay,
    }).populate("classId", "name").lean();

    const expectedPeriods = [];
    
    timeTables.forEach((tt) => {
      tt.timeSlots.forEach((slot) => {
        if (slot.day === todayDay) {
          expectedPeriods.push({
            classId: tt.classId._id.toString(),
            className: tt.classId.name,
            subjectId: slot.subjectId?.toString(),
            teacherId: slot.teacherId?.toString(),
            periodNumber: slot.periodNumber,
          });
        }
      });
    });

    if (expectedPeriods.length === 0) {
      return NextResponse.json({ message: "No periods scheduled for today" });
    }

    // 4. Fetch today's attendance records
    const attendances = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    // Create a set of marked periods for quick lookup
    // Format: classId_subjectId_periodNumber
    const markedPeriods = new Set(
      attendances.map(
        (att) => `${att.classId}_${att.subjectId}_${att.periodNumber}`
      )
    );

    // 5. Find missing attendances
    const missingByTeacher = {};

    for (const expected of expectedPeriods) {
      // If any crucial ID is missing, skip
      if (!expected.teacherId || !expected.classId || !expected.subjectId) continue;

      const key = `${expected.classId}_${expected.subjectId}_${expected.periodNumber}`;
      if (!markedPeriods.has(key)) {
        if (!missingByTeacher[expected.teacherId]) {
          missingByTeacher[expected.teacherId] = [];
        }
        missingByTeacher[expected.teacherId].push(expected);
      }
    }

    if (Object.keys(missingByTeacher).length === 0) {
      return NextResponse.json({ message: "All attendances marked for today!" });
    }

    // 6. Fetch subjects to display subject names
    const subjectIds = [...new Set(expectedPeriods.map(ep => ep.subjectId).filter(Boolean))];
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean();
    const subjectMap = {};
    subjects.forEach(sub => {
      subjectMap[sub._id.toString()] = sub.name;
    });

    // 7. Send Push Notifications
    const teachers = await User.find({
      _id: { $in: Object.keys(missingByTeacher) },
    }).lean();

    let notificationCount = 0;

    const pushPromises = teachers.map(async (teacher) => {
      if (!teacher.pushSubscriptions || teacher.pushSubscriptions.length === 0) {
        return; // Skip if teacher hasn't subscribed
      }

      const missing = missingByTeacher[teacher._id.toString()];
      
      // Send a separate notification for each missed period
      const periodPromises = missing.map(async (m) => {
        const payload = JSON.stringify({
          title: "Missing Attendance Alert 🚨",
          body: `You missed marking attendance for Period ${m.periodNumber}: ${m.className} (${subjectMap[m.subjectId] || 'Subject'})`,
          url: "/dashboard/attendance-sheet"
        });

        // Send to all registered devices of the teacher
        const devicePromises = teacher.pushSubscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(sub, payload);
            notificationCount++;
          } catch (error) {
            console.error(`Failed to send push to teacher ${teacher.name}:`, error.body || error);
            // If status code is 410 or 404, the subscription has expired or is no longer valid.
            // Ideally, we should remove it from the DB here.
          }
        });

        await Promise.all(devicePromises);
      });

      await Promise.all(periodPromises);
    });

    await Promise.all(pushPromises);

    return NextResponse.json({ 
      success: true, 
      message: `Sent ${notificationCount} push notifications to teachers with missing attendance.` 
    });

  } catch (error) {
    console.error("Error in missing-attendance cron:", error);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
