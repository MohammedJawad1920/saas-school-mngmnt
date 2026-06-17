import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Mark from "@/models/Mark";
import Class from "@/models/Class";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await connectToDB();

    // 1. Fetch all exams with populated class and student references
    // Note: students.studentId is already populated with name/id in some cases, 
    // but here we just need the IDs to match against the current user.
    const exams = await Mark.find()
      .populate("classId", "name")
      .lean();

    const toppersByExam = [];

    exams.forEach((exam) => {
      if (!exam.students || exam.students.length === 0) return;

      // Calculate totals for each student in this exam
      const studentStats = exam.students.map((entry) => {
        let total = 0;
        const marks = entry.marks instanceof Map ? Object.fromEntries(entry.marks) : (entry.marks || {});
        
        // Sum up all subject marks
        exam.subjects.forEach((subj) => {
          const val = marks[subj.name];
          if (subj.subColumns && subj.subColumns.length > 0) {
            subj.subColumns.forEach((sc) => {
              total += (val && typeof val === "object") ? (Number(val[sc.name]) || 0) : 0;
            });
          } else {
            total += Number(val || 0);
          }
        });

        const maxTotal = exam.subjects.reduce((sum, s) => {
          if (s.subColumns && s.subColumns.length > 0) {
            return sum + s.subColumns.reduce((subSum, sc) => subSum + (Number(sc.maxMark) || 0), 0);
          }
          return sum + (Number(s.maxMark) || 0);
        }, 0);
        const percentage = maxTotal > 0 ? (total / maxTotal) * 100 : 0;

        return {
          studentId: entry.studentId?._id || entry.studentId,
          total,
          percentage: percentage.toFixed(2),
          examName: exam.examName,
          className: exam.classId?.name || "Unknown Class",
          classId: exam.classId?._id || exam.classId,
        };
      });

      // Sort by total marks descending to find toppers
      studentStats.sort((a, b) => b.total - a.total);

      if (studentStats.length > 0) {
        const highestTotal = studentStats[0].total;
        
        // Include all students who tied for 1st place
        const examToppers = studentStats.filter(s => s.total === highestTotal);
        
        toppersByExam.push({
          examId: exam._id,
          examName: exam.examName,
          classId: exam.classId?._id || exam.classId,
          className: exam.classId?.name || "Unknown Class",
          highestTotal,
          toppers: examToppers
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: toppersByExam
    });

  } catch (error) {
    console.error("Error fetching marks toppers:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch academic toppers." },
      { status: 500 }
    );
  }
}
