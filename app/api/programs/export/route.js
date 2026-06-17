// app/api/programs/export/route.js
import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Program from "@/models/Program";

export async function GET(req) {
  try {
    await connectToDB();

    const programs = await Program.find().populate("divisionId", "name").lean();

    // Format data for CSV export
    const exportData = programs.map((program) => ({
      name: program.name,
      type: program.type,
      category: program.category,
      division: program.divisionId?.name || "",
      maxParticipants: program.maxParticipants,
      pointScheme: program.pointScheme,
      rules: program.rules || "",
      topics: program.topics || "",
    }));

    return NextResponse.json({
      success: true,
      data: exportData,
      count: exportData.length,
    });
  } catch (error) {
    console.error("Programs export error:", error);
    return NextResponse.json(
      { error: "Failed to export programs" },
      { status: 500 }
    );
  }
}
