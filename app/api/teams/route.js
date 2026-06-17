import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Team from "@/models/Team";
import apiResponse from "@/lib/apiResponse";
import { getYear } from "@/lib/getYear";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page")) || 0;
    const limit = parseInt(url.searchParams.get("limit")) || 20;
    const name = url.searchParams.get("name");
    const projectionParam = url.searchParams.get("projection");

    const query = {};
    if (name) {
      query.name = { $regex: name, $options: "i" };
    }

    // Add year to query
    query.year = await getYear(req);

    const projections = {};
    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field.trim()] = 1;
      });
    }

    const sortByPoints = url.searchParams.get("sortByPoints") === "true";

    const total = await Team.countDocuments(query);
    const teams = await Team.find(query, projections)
      .populate("leaderId", "name")
      .skip(page * limit)
      .limit(limit)
      .lean();

    const formattedTeams = teams.map((team) => ({
      ...team,
      totalPoints: (team.stagePoints || 0) + (team.offStagePoints || 0),
      leaderName: team.leaderId?.name || "N/A",
      color: team.color || "#808080",
      membersCount: team.membersId?.length || 0,
    }));

    if (sortByPoints) {
      formattedTeams.sort((a, b) => b.totalPoints - a.totalPoints);
    }

    return NextResponse.json(
      {
        teams: formattedTeams,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        message: "Teams fetched successfully!",
      },
      { 
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0"
        }
      }
    );
  } catch (error) {
    console.error("Error fetching teams:", error);
    return apiResponse.error(error);
  }
}

export async function POST(req) {
  try {
    await connectToDB();
    const data = await req.json();

    // Ensure year is set
    if (!data.year) {
      data.year = await getYear(req);
    }

    const team = await Team.create(data);

    return NextResponse.json(
      { message: "Team created successfully!", team },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating team:", error);
    return apiResponse.error(error);
  }
}

export async function PUT(req) {
  try {
    await connectToDB();
    const data = await req.json();

    const { ids, _id: _idToExclude, ...updateData } = data;

    if (!ids || ids.length === 0) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    // Explicitly identify color update to ensure it's not missed
    if (updateData.color) {
      console.log(`Force updating team ${ids[0]} color to: ${updateData.color}`);
    }

    const updatedTeam = await Team.findOneAndUpdate(
      { _id: ids[0] },
      { $set: updateData },
      { new: true, runValidators: true, lean: true }
    );

    if (!updatedTeam) {
      return NextResponse.json({ message: "Team not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Team updated successfully!", team: updatedTeam },
      { 
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0"
        }
      }
    );
  } catch (error) {
    console.error("CRITICAL Teams PUT Error:", error);
    return apiResponse.error(error);
  }
}
