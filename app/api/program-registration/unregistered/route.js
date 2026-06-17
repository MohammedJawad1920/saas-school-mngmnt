import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Program from "@/models/Program";

export async function GET(request) {
  try {
    await connectToDB();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || "0";
    const limit = parseInt(searchParams.get("limit")) || Infinity;
    const skip = page * limit;

    const programId = searchParams.get("programId");
    const divisionId = searchParams.get("divisionId");
    const programType = searchParams.get("programType");
    const programCategory = searchParams.get("programCategory");
    const teamId = searchParams.get("teamId");

    // Build aggregation pipeline for efficient filtering
    let pipeline = [
      // Match program criteria first
      {
        $match: {
          ...(programId && { _id: new mongoose.Types.ObjectId(programId) }),
          ...(divisionId && {
            divisionId: divisionId,
          }),
          ...(programType && { type: programType }),
          ...(programCategory && { category: programCategory }),
        },
      },

      // Lookup division details
      {
        $lookup: {
          from: "divisions",
          localField: "divisionId",
          foreignField: "_id",
          as: "divisionDetails",
        },
      },
      {
        $unwind: { path: "$divisionDetails", preserveNullAndEmptyArrays: true },
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
                ...(teamId && { teamId }),
              },
            },
          ],
          as: "registrations",
        },
      },
    ];

    if (teamId) {
      // For specific team: programs not registered by this team
      pipeline.push({
        $match: {
          registrations: { $size: 0 },
        },
      });
    } else {
      // For Program Committee: add team analysis
      pipeline.push(
        // Lookup all teams
        {
          $lookup: {
            from: "teams",
            pipeline: [{ $project: { _id: 1, name: 1 } }],
            as: "allTeams",
          },
        },
        // Calculate missing teams
        {
          $addFields: {
            registeredTeamIds: "$registrations.teamId",
            totalTeamsCount: { $size: "$allTeams" },
            registeredTeamsCount: { $size: "$registrations" },
          },
        },
        {
          $addFields: {
            missingTeams: {
              $filter: {
                input: "$allTeams",
                cond: {
                  $not: {
                    $in: ["$$this._id", "$registeredTeamIds"],
                  },
                },
              },
            },
          },
        },
        {
          $addFields: {
            missingTeamsCount: { $size: "$missingTeams" },
            hasMissingRegistrations: {
              $gt: [{ $size: "$missingTeams" }, 0],
            },
          },
        },
        // Only programs with missing registrations
        {
          $match: {
            hasMissingRegistrations: true,
          },
        }
      );
    }

    // Get total count
    const totalResult = await Program.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    // Add pagination and execute
    const results = await Program.aggregate([
      ...pipeline,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Transform results
    const transformedData = results.map((program, index) => {
      const baseData = {
        _id: program._id,
        serialNo: skip + index + 1,
        programId: program._id,
        programName: program.name,
        programType: program.type,
        programCategory: program.category,
        maxParticipants: program.maxParticipants,
        divisionId: program.divisionDetails?._id,
        divisionName: program.divisionDetails?.name || "Unknown",
        registrationStatus: "Not Registered",
        createdAt: program.createdAt,
        updatedAt: program.updatedAt,
      };

      if (!teamId && program.missingTeams) {
        const missingTeamNames = program.missingTeams.map((team) => team.name);
        return {
          ...baseData,
          missingTeamsCount: program.missingTeamsCount,
          registeredTeamsCount: program.registeredTeamsCount,
          totalTeamsCount: program.totalTeamsCount,
          registrationStatus: `${missingTeamNames.join(", ")} Missing`,
        };
      }

      return baseData;
    });

    return NextResponse.json({
      success: true,
      unregisteredPrograms: transformedData,
      pagination: {
        page,
        totalPages: Math.ceil(total / limit) || 1,
        total,
        hasNextPage: skip + limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching unregistered programs:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch unregistered programs",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
