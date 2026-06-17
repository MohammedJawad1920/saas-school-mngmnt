import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Period from "@/models/Period";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "page" && key !== "limit") {
        filterParams[key] = value;
      }
    }

    const query = {};

    if (filterParams.periodNumber) {
      query.periodNumber = filterParams.periodNumber;
    }

    const periods = await Period.find(query)
      .skip(page * limit)
      .limit(limit)
      .sort({ periodNumber: 1 });

    const total = await Period.countDocuments(query);

    return NextResponse.json(
      {
        periods,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Periods fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();

    const { periodNumber, startTime, endTime } = await req.json();
    const newPeriod = await Period.create({
      periodNumber,
      startTime,
      endTime,
    });
    return NextResponse.json(
      { newPeriod, message: "Period created successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req, res) {
  try {
    await connectToDB();

    const body = await req.json();
    const { ids, periodNumber, startTime, endTime } = body;

    const _id = ids[0];

    if (ids.length > 1) {
      const updatedPeriods = await Period.updateMany(
        { _id: { $in: ids } },
        { $set: { periodNumber, startTime, endTime } }
      );
      return NextResponse.json(
        { updatedPeriods, message: "Periods Updated successfully!" },
        { status: 200 }
      );
    }

    const updatedPeriod = await Period.findOneAndUpdate(
      { _id },
      { periodNumber, startTime, endTime },
      { new: true }
    );
    return NextResponse.json(
      { updatedPeriod, message: "Period Updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req, res) {
  try {
    await connectToDB();

    const { ids } = await req.json();
    const _id = ids[0];
    if (ids.length > 1) {
      const deletedPeriods = await Period.deleteMany({ _id: { $in: ids } });
      return NextResponse.json(
        { deletedPeriods, message: "Periods deleted successfully!" },
        { status: 200 }
      );
    }
    const deletedPeriod = await Period.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedPeriod, message: "Period deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
