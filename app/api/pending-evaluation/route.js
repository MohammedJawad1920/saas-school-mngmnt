// app/api/pending-evaluation/route.js
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

    // Build aggregation pipeline
    let pipeline = [
      // Match registrations with code letters but not evaluated
      {
        $match: {
          isResultDeclared: false,
          // Has at least one participant with code letter
          "participants.codeLetter": { $exists: true, $ne: "", $ne: null },
          // But all participants have zero marks (not evaluated)
          "participants.totalMarks": { $not: { $gt: 0 } },
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

      // Count participants with code letters
      {
        $addFields: {
          participantsWithCodeLetters: {
            $size: {
              $filter: {
                input: "$participants",
                cond: {
                  $and: [
                    { $ne: ["$$this.codeLetter", ""] },
                    { $ne: ["$$this.codeLetter", null] },
                  ],
                },
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
          participantsWithCodeLetters: 1,
          totalParticipants: 1,
          status: "Pending Evaluation",
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
      participantsCount: reg.participantsWithCodeLetters || 0,
      totalParticipants: reg.totalParticipants || 0,
      status: reg.status,
    }));

    return NextResponse.json(
      {
        success: true,
        pendingEvaluation: transformedData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNextPage: skip + limit < total,
          hasPrevPage: page > 0,
        },
        message: "Pending evaluations fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching pending evaluation:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch pending evaluations",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
