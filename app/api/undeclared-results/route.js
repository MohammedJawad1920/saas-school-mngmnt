// app/api/undeclared-results/route.js
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import ProgramRegistration from "@/models/ProgramRegistration";

export async function GET(request) {
  try {
    await connectToDB();

    const searchParams = new URL(request.url).searchParams;
    const page = parseInt(searchParams.get("page")) || 0;
    const limit = parseInt(searchParams.get("limit")) || 50;
    const skip = page * limit;

    // Get filter params
    const divisionId = searchParams.get("divisionId");
    const teamId = searchParams.get("teamId");
    const programCategory = searchParams.get("programCategory");
    const programType = searchParams.get("programType");

    // Build aggregation pipeline
    let pipeline = [
      // Match registrations with marks but result not declared
      {
        $match: {
          isResultDeclared: false,
          // Has at least one participant with marks assigned
          "participants.totalMarks": { $gt: 0 },
        },
      },

      // Lookup program details
      {
        $lookup: {
          from: "programs",
          localField: "programId",
          foreignField: "_id",
          as: "program",
        },
      },
      { $unwind: "$program" },

      // Lookup division details
      {
        $lookup: {
          from: "divisions",
          localField: "program.divisionId",
          foreignField: "id",
          as: "division",
        },
      },
      {
        $unwind: {
          path: "$division",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Lookup team details
      {
        $lookup: {
          from: "teams",
          localField: "teamId",
          foreignField: "id",
          as: "team",
        },
      },
      {
        $unwind: {
          path: "$team",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Apply additional filters
      ...(divisionId ? [{ $match: { "division.id": divisionId } }] : []),
      ...(teamId ? [{ $match: { teamId: teamId } }] : []),
      ...(programCategory
        ? [{ $match: { "program.category": programCategory } }]
        : []),
      ...(programType ? [{ $match: { "program.type": programType } }] : []),

      // Count evaluated participants
      {
        $addFields: {
          evaluatedParticipants: {
            $size: {
              $filter: {
                input: "$participants",
                cond: { $gt: ["$$this.totalMarks", 0] },
              },
            },
          },
          totalParticipants: { $size: "$participants" },
        },
      },

      // Project required fields
      {
        $project: {
          _id: 1,
          programId: "$program._id",
          programName: "$program.name",
          programType: "$program.type",
          programCategory: "$program.category",
          divisionId: "$division.id",
          divisionName: "$division.name",
          teamId: "$team.id",
          teamName: "$team.name",
          evaluatedParticipants: 1,
          totalParticipants: 1,
          status: "Ready to Declare",
          createdAt: 1,
          updatedAt: 1,
        },
      },

      // Sort by program name, then team name
      { $sort: { programName: 1, teamName: 1 } },
    ];

    // Get total count
    const totalResult = await ProgramRegistration.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    // Add pagination and execute
    const results = await ProgramRegistration.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: limit },
    ]);

    // Transform results
    const transformedData = results.map((reg, index) => ({
      id: reg._id?.toString(),
      serialNo: skip + index + 1,
      programName: reg.programName || "Unknown",
      programType: reg.programType,
      programCategory: reg.programCategory,
      divisionName: reg.divisionName || "Unknown",
      teamName: reg.teamName || "Unknown",
      evaluatedParticipants: reg.evaluatedParticipants || 0,
      totalParticipants: reg.totalParticipants || 0,
      status: reg.status,
    }));

    return NextResponse.json(
      {
        success: true,
        undeclaredResults: transformedData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNextPage: skip + limit < total,
          hasPrevPage: page > 0,
        },
        message: "Undeclared results fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching undeclared results:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch undeclared results",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
