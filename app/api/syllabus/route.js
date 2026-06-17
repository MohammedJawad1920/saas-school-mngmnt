import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Syllabus from "@/models/Syllabus";
import { apiResponse } from "@/lib/apiResponse";
import cloudinary from "@/lib/cloudinary";

export async function GET(req, res) {
  try {
    await connectToDB();
    const url = new URL(req.url);
    const searchParams = {};
    for (const [key, value] of url.searchParams.entries()) {
      searchParams[key] = value;
    }

    const query = {};
    if (searchParams.year) {
      query.year = searchParams.year;
    }

    if (searchParams.course) {
      query.course = searchParams.course;
    }

    const syllabuses = await Syllabus.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ syllabuses }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const { course, year, fileUrl, fileName } = await req.json();
    const newSyllabus = new Syllabus({
      course,
      year,
      fileUrl,
      fileName,
    });
    await newSyllabus.save();
    return NextResponse.json({ newSyllabus }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req) {
  try {
    await connectToDB();
    const { _id, course, year } = await req.json();

    if (!_id) {
      return NextResponse.json(
        { message: "Syllabus ID is required" },
        { status: 400 }
      );
    }

    const updatedSyllabus = await Syllabus.findByIdAndUpdate(
      _id,
      {
        course,
        year,
      },
      { new: true }
    );

    if (!updatedSyllabus) {
      return NextResponse.json(
        { message: "Syllabus not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ updatedSyllabus }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req) {
  try {
    await connectToDB();
    const { _id, fileUrl } = await req.json();

    if (!_id) {
      return NextResponse.json(
        { message: "Syllabus ID is required" },
        { status: 400 }
      );
    }

    const syllabus = await Syllabus.findById(_id);

    if (!syllabus) {
      return NextResponse.json(
        { message: "Syllabus not found" },
        { status: 404 }
      );
    }

    const urlToDelete = fileUrl || syllabus.fileUrl;
    if (urlToDelete && urlToDelete.includes("cloudinary.com")) {
      try {
        // Explicitly configure Cloudinary
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        let resourceType = "raw";
        if (urlToDelete.includes("/image/upload/")) {
          resourceType = "image";
        } else if (urlToDelete.includes("/video/upload/")) {
          resourceType = "video";
        } else if (urlToDelete.includes("/raw/upload/")) {
          resourceType = "raw";
        }

        const urlParts = urlToDelete.split("/");
        const uploadIndex = urlParts.indexOf("upload");

        if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
          const pathAfterVersion = urlParts.slice(uploadIndex + 2).join("/");
          let publicId;
          if (resourceType === "raw") {
            publicId = pathAfterVersion;
          } else {
            publicId = pathAfterVersion.replace(/\.[^/.]+$/, "");
          }

          await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
          });
        }
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
      }
    }

    await Syllabus.findByIdAndDelete(_id);

    return NextResponse.json(
      { message: "Syllabus deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}