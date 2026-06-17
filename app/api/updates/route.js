import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Update from "@/models/Update";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    const query = {};
    
    const updates = await Update.find(query)
      .skip(page * limit)
      .limit(limit)
      .sort({ date: -1 });

    const total = await Update.countDocuments(query);

    return NextResponse.json(
      {
        updates,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Updates fetched successfully!",
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

    const data = await req.json();
    const newUpdate = await Update.create({
      heading: data.heading,
      date: data.date,
      news: data.news,
      image: data.image,
    });
    return NextResponse.json(
      { newUpdate, message: "Update created successfully!" },
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
    const { ids, heading, date, news, image } = body;

    const _id = ids[0];

    if (ids.length > 1) {
      const updatedUpdates = await Update.updateMany(
        { _id: { $in: ids } },
        { $set: { heading, date, news, image } }
      );
      return NextResponse.json(
        { updatedUpdates, message: "Updates updated successfully!" },
        { status: 200 }
      );
    }

    const updatedUpdate = await Update.findOneAndUpdate(
      { _id },
      { heading, date, news, image },
      { new: true }
    );
    return NextResponse.json(
      { updatedUpdate, message: "Update updated successfully!" },
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
      const deletedUpdates = await Update.deleteMany({ _id: { $in: ids } });
      return NextResponse.json(
        { deletedUpdates, message: "Updates deleted successfully!" },
        { status: 200 }
      );
    }
    const deletedUpdate = await Update.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedUpdate, message: "Update deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
