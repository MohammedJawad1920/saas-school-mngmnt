import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export async function POST(req) {
  try {
    const { image } = await req.json();



    if (!image) {
      return NextResponse.json(
        { message: "No image provided" },
        { status: 400 }
      );
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: "profiles",
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    });

    return NextResponse.json(
      {
        url: result.secure_url,
        publicId: result.public_id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error.message);
    return NextResponse.json(
      { message: `Error uploading image: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const { publicId } = await req.json();

    if (!publicId) {
      return NextResponse.json(
        { message: "No image ID provided" },
        { status: 400 }
      );
    }

    // Delete image from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === "ok") {
      return NextResponse.json(
        { message: "Image deleted successfully!" },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "Failed to delete image" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error.message);
    return NextResponse.json(
      { message: "Error deleting image" },
      { status: 500 }
    );
  }
}
