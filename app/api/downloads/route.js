import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Download from "@/models/Download";
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
      // The year field on Download is an academic year number (1–5).
      // The global fetchItems helper injects the active-year cookie which is a
      // festival session string like "2025 november". We must reject those.
      // NOTE: parseInt("2025 november") returns 2025 (not NaN!), so we use a
      // pure-digits regex to ensure only actual numeric strings are applied.
      if (/^\d+$/.test(searchParams.year)) {
        query.year = parseInt(searchParams.year, 10);
      }
    }

    if (searchParams.semester) {
      query.semester = searchParams.semester;
    }

    if (searchParams.course) {
      query.course = searchParams.course;
    }

    const downloads = await Download.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ downloads }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    await connectToDB();
    const { course, year, semester, subject, fileUrl } = await req.json();
    const newDownload = new Download({
      course,
      year,
      semester,
      subject,
      fileUrl,
    });
    await newDownload.save();
    return NextResponse.json({ newDownload }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req) {
  try {
    await connectToDB();
    const { _id, course, year, semester, subject } = await req.json();

    if (!_id) {
      return NextResponse.json(
        { message: "Download ID is required" },
        { status: 400 }
      );
    }

    const updatedDownload = await Download.findByIdAndUpdate(
      _id,
      {
        course,
        year,
        semester,
        subject,
      },
      { new: true }
    );

    if (!updatedDownload) {
      return NextResponse.json(
        { message: "Download not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ updatedDownload }, { status: 200 });
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
        { message: "Download ID is required" },
        { status: 400 }
      );
    }

    // Find the download to get fileUrl if not provided
    const download = await Download.findById(_id);

    if (!download) {
      return NextResponse.json(
        { message: "Download not found" },
        { status: 404 }
      );
    }

    // Extract public_id from Cloudinary URL
    const urlToDelete = fileUrl || download.fileUrl;
    if (urlToDelete && urlToDelete.includes("cloudinary.com")) {
      try {
        // Explicitly configure Cloudinary
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        // Determine resource_type from URL (raw, image, video)
        let resourceType = "raw";
        if (urlToDelete.includes("/image/upload/")) {
          resourceType = "image";
        } else if (urlToDelete.includes("/video/upload/")) {
          resourceType = "video";
        } else if (urlToDelete.includes("/raw/upload/")) {
          resourceType = "raw";
        }

        // Extract public_id from URL
        const urlParts = urlToDelete.split("/");
        const uploadIndex = urlParts.indexOf("upload");

        if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
          // Get everything after 'upload/v123456/'
          const pathAfterVersion = urlParts.slice(uploadIndex + 2).join("/");

          // For raw files, keep the extension in public_id
          let publicId;
          if (resourceType === "raw") {
            publicId = pathAfterVersion; // Keep extension for raw files
          } else {
            publicId = pathAfterVersion.replace(/\.[^/.]+$/, ""); // Remove extension for images
          }

          console.log(
            `Deleting from Cloudinary - Public ID: ${publicId}, Resource Type: ${resourceType}`
          );

          // Delete from Cloudinary
          const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
          });

          console.log(`Cloudinary deletion result:`, result);
        }
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
        // Continue with database deletion even if Cloudinary delete fails
      }
    }

    // Delete from database
    await Download.findByIdAndDelete(_id);

    return NextResponse.json(
      { message: "Download deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete error:", error);
    return apiResponse.error(error);
  }
}
