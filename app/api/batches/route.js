import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Batch from "@/models/Batch";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();

    // Parse URL to get search params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    // Build filter object from query parameters
    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      // Skip pagination parameters
      if (key !== "page" && key !== "limit" && key !== "projection") {
        filterParams[key] = value;
      }
    }

    // Get projection param
    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    // Convert projection param to MongoDB projection object
    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1; // Include each field
      });
    }

    // Build MongoDB query from filter params
    const query = {};

    if (filterParams?._id) {
      query._id = filterParams?._id;
    }
    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }
    if (filterParams.status) {
      query.status = filterParams.status;
    }
    if (filterParams.startYear) {
      query.startYear = filterParams.startYear;
    }
    if (filterParams.endYear) {
      query.endYear = filterParams.endYear;
    }

    // Execute query with pagination
    const batches = await Batch.find(query, projections)
      .skip(page * limit)
      .limit(limit)
      .sort({ _id: 1 })
      .collation({ locale: "en_US", numericOrdering: true });
    // Get total count for pagination info
    const total = await Batch.countDocuments(query);

    return NextResponse.json(
      {
        batches,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Batches fetched successfully!",
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

    const { _id, name, startYear, endYear, status } = await req.json();
    const newBatch = await Batch.create({
      _id,
      name,
      startYear,
      endYear,
      status,
    });
    return NextResponse.json(
      { newBatch, message: "Batch created successfully!" },
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
    const { ids, name, startYear, endYear, status } = body;

    const _id = ids[0];

    if (ids.length > 1) {
      const updatedBatches = await Batch.updateMany(
        { _id: { $in: ids } },
        { $set: { name, startYear, endYear, status } }
      );
      return NextResponse.json(
        { updatedBatches, message: "Batches Updated successfully!" },
        { status: 200 }
      );
    }

    const updatedBatch = await Batch.findOneAndUpdate(
      { _id },
      { name, startYear, endYear, status },
      { new: true }
    );
    return NextResponse.json(
      { updatedBatch, message: "Batch Updated successfully!" },
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
      const deletedBatches = await Batch.deleteMany({ _id: { $in: ids } });
      return NextResponse.json(
        { deletedBatches, message: "Batches deleted successfully!" },
        { status: 200 }
      );
    }
    const deletedBatch = await Batch.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedBatch, message: "Batch deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
