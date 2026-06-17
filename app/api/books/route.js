import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Book from "@/models/Book";
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
    if (searchParams.name) {
      // Use a case-insensitive regex for searching by book name
      query.name = { $regex: new RegExp(searchParams.name, "i") };
    }

    if (searchParams.course) {
      query.course = searchParams.course;
    }

    const books = await Book.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ books }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function POST(req, res) {
  try {
    const activeRole = req.headers.get("active-role");
    if (activeRole !== "College Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    await connectToDB();
    const { name, course, fileUrl, fileName } = await req.json();
    const newBook = new Book({
      name,
      course,
      fileUrl,
      fileName,
    });
    await newBook.save();
    return NextResponse.json({ newBook }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function PUT(req) {
  try {
    const activeRole = req.headers.get("active-role");
    if (activeRole !== "College Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    await connectToDB();
    const { _id, name, course } = await req.json();

    if (!_id) {
      return NextResponse.json(
        { message: "Book ID is required" },
        { status: 400 }
      );
    }

    const updatedBook = await Book.findByIdAndUpdate(
      _id,
      {
        name,
        course,
      },
      { new: true }
    );

    if (!updatedBook) {
      return NextResponse.json(
        { message: "Book not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ updatedBook }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}

export async function DELETE(req) {
  try {
    const activeRole = req.headers.get("active-role");
    if (activeRole !== "College Admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    await connectToDB();
    const { _id, fileUrl } = await req.json();

    if (!_id) {
      return NextResponse.json(
        { message: "Book ID is required" },
        { status: 400 }
      );
    }

    const book = await Book.findById(_id);

    if (!book) {
      return NextResponse.json(
        { message: "Book not found" },
        { status: 404 }
      );
    }

    const urlToDelete = fileUrl || book.fileUrl;
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

    await Book.findByIdAndDelete(_id);

    return NextResponse.json(
      { message: "Book deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
