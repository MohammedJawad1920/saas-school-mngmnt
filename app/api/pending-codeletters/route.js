// app/api/pending-codeletters/route.js
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Program from "@/models/Program";
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
    const programType = searchParams.get("programType");
    const programCategory = searchParams.get("programCategory");

    // Build aggregation pipeline
    let pipeline = [
      // Match program criteria first
      {
        $match: {
          ...(divisionId && { divisionId }),
          ...(programType && { type: programType }),
          ...(programCategory && { category: programCategory }),
        },
      },

      // Lookup division details
      {
        $lookup: {
          from: "divisions",
          localField: "divisionId",
          foreignField: "id",
          as: "divisionDetails",
        },
      },
      {
        $unwind: {
          path: "$divisionDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Lookup registrations for this program
      {
        $lookup: {
          from: "programregistrations",
          let: { programId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$programId", "$$programId"] },
              },
            },
          ],
          as: "registrations",
        },
      },

      // Only show programs with ZERO registrations
      {
        $match: {
          registrations: { $size: 0 },
        },
      },

      // Project required fields
      {
        $project: {
          _id: 1,
          id: 1,
          name: 1,
          type: 1,
          category: 1,
          maxParticipants: 1,
          divisionId: 1,
          divisionName: "$divisionDetails.name",
          registrationsCount: { $size: "$registrations" },
          createdAt: 1,
          updatedAt: 1,
        },
      },

      // Sort by name
      { $sort: { name: 1 } },
    ];

    // Get total count
    const totalResult = await Program.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    // Add pagination and execute
    const results = await Program.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: limit },
    ]);

    // Transform results
    const transformedData = results.map((program, index) => ({
      id: program._id?.toString() || program.id,
      serialNo: skip + index + 1,
      programId: program._id?.toString() || program.id,
      programName: program.name,
      programType: program.type,
      programCategory: program.category,
      maxParticipants: program.maxParticipants,
      divisionId: program.divisionId,
      divisionName: program.divisionName || "Unknown",
      registrationsCount: 0,
      status: "No Registration",
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
    }));

    return NextResponse.json(
      {
        success: true,
        pendingCodeLetters: transformedData,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNextPage: skip + limit < total,
          hasPrevPage: page > 0,
        },
        message: "Programs without registrations fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching pending code letters:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch programs without registrations",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
