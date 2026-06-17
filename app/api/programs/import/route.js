// app/api/programs/import/route.js
import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Program from "@/models/Program";
import Division from "@/models/Division";

export async function POST(req) {
  try {
    await connectToDB();

    const { data } = await req.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    // Fetch divisions for mapping
    const divisions = await Division.find().select("id name").lean();
    const divisionMap = new Map(
      divisions.map((d) => [d.name.toLowerCase().trim(), d._id.toString()])
    );

    const results = {
      success: [],
      errors: [],
      imported: 0,
      failed: 0,
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // Excel row number

      try {
        // Validate required fields
        if (!row.name || !row.type || !row.category || !row.division) {
          throw new Error("Missing required fields");
        }

        // Find division
        const divisionId = divisionMap.get(row.division.toLowerCase().trim());
        if (!divisionId) {
          throw new Error(`Division '${row.division}' not found`);
        }

        // Check for duplicate
        const existing = await Program.findOne({
          name: new RegExp(`^${row.name.trim()}$`, "i"),
          divisionId,
        });

        if (existing) {
          throw new Error(
            `Program '${row.name}' already exists in this division`
          );
        }

        // Create program
        const program = await Program.create({
          name: row.name.toUpperCase().trim(),
          type: row.type,
          category: row.category,
          divisionId,
          maxParticipants: parseInt(row.maxParticipants) || 1,
          pointScheme: row.pointScheme || "3, 2, 1",
          rules: row.rules || "",
          topics: row.topics || "",
        });

        results.success.push({
          row: rowNumber,
          name: program.name,
        });
        results.imported++;
      } catch (error) {
        results.errors.push({
          row: rowNumber,
          name: row.name || "Unknown",
          error: error.message,
        });
        results.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${results.imported} programs, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error("Programs import error:", error);
    return NextResponse.json(
      { error: "Failed to import programs" },
      { status: 500 }
    );
  }
}
