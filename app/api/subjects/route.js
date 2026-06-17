import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import Subject from "@/models/Subject";
import { NextResponse } from "next/server";

export async function GET(req, res) {
  try {
    await connectToDB();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "0");
    const limit = parseInt(url.searchParams.get("limit")) || Infinity;

    const filterParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (key !== "page" && key !== "limit" && key !== "projection") {
        filterParams[key] = value;
      }
    }

    const projectionParam = url.searchParams.get("projection");
    let projections = {};

    if (projectionParam) {
      const fields = projectionParam.split(",");
      fields.forEach((field) => {
        projections[field] = 1;
      });
    }

    const query = {};

    if (filterParams?._id) {
      query._id = filterParams?._id;
    }
    if (filterParams.name) {
      query.name = { $regex: filterParams.name, $options: "i" };
    }

    const subjects = await Subject.find(query, projections)
      .skip(page * limit)
      .limit(limit)
      .sort({ _id: 1 })
      .collation({ locale: "en_US", numericOrdering: true });
    const total = await Subject.countDocuments(query);

    return NextResponse.json(
      {
        subjects,
        pagination: {
          page,
          limit,
          total,
          totalPages:
            limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
        },
        message: "Subjects fetched successfully!",
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

    const { _id, name } = await req.json();
    const newSubject = await Subject.create({
      _id,
      name,
    });
    return NextResponse.json(
      { newSubject, message: "Subject created successfully!" },
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
    const { ids, name } = body;

    const _id = ids[0];

    if (ids.length > 1) {
      const updatedSubjects = await Subject.updateMany(
        { _id: { $in: ids } },
        { $set: { name } }
      );
      return NextResponse.json(
        { updatedSubjects, message: "Subjects Updated successfully!" },
        { status: 200 }
      );
    }

    const updatedSubject = await Subject.findOneAndUpdate(
      { _id },
      { name },
      { new: true }
    );
    return NextResponse.json(
      { updatedSubject, message: "Subject Updated successfully!" },
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
      const deletedSubjects = await Subject.deleteMany({ _id: { $in: ids } });
      return NextResponse.json(
        { deletedSubjects, message: "Subjects deleted successfully!" },
        { status: 200 }
      );
    }
    const deletedSubject = await Subject.findByIdAndDelete(_id);
    return NextResponse.json(
      { deletedSubject, message: "Subject deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
