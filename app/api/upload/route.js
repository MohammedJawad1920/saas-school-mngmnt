import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  const isE2ETest = req.headers.get("x-e2e-test") === "true";

  if (isE2ETest) {
    return NextResponse.json(
      {
        secure_url: "https://e2e-test-dummy-url.com/test_syllabus.txt",
        public_id: "e2e-test-public-id",
        format: "txt",
        resource_type: "raw",
      },
      { status: 200 }
    );
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    console.log("Upload request received. File:", file ? file.name : "null", "Size:", file ? file.size : 0);

    if (!file) {
      return NextResponse.json(
        { message: "No file provided" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get file extension
    const fileName = file.name;
    const fileExtension = fileName.split(".").pop().toLowerCase();

    // Determine if it's a PDF or document (should be raw) vs image
    const isPdfOrDoc = [
      "pdf",
      "doc",
      "docx",
      "ppt",
      "pptx",
      "xls",
      "xlsx",
    ].includes(fileExtension);

    // Upload to Cloudinary using upload_stream
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "downloads",
          resource_type: isPdfOrDoc ? "raw" : "auto", // Use 'raw' for documents
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(buffer);
    });

    return NextResponse.json(
      {
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        format: uploadResult.format,
        resource_type: uploadResult.resource_type,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return NextResponse.json(
      {
        message: "Error uploading file",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
