import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("url");
    const filename = searchParams.get("filename");

    if (!fileUrl) {
      return NextResponse.json(
        { message: "File URL is required" },
        { status: 400 }
      );
    }

    console.log("Downloading file from:", fileUrl);
    console.log("Requested filename:", filename);

    // Fetch the file from Cloudinary with proper headers
    const response = await fetch(fileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    console.log("Cloudinary response status:", response.status);
    console.log(
      "Content-Type from Cloudinary:",
      response.headers.get("content-type")
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudinary error:", errorText);
      throw new Error(
        `Failed to fetch file from Cloudinary. Status: ${response.status}`
      );
    }

    // Get the content type from Cloudinary's response
    let contentType = response.headers.get("content-type");

    // If no content-type or generic, determine from filename extension
    if (!contentType || contentType === "application/octet-stream") {
      const ext = filename.toLowerCase().split(".").pop();
      const mimeTypes = {
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
      contentType = mimeTypes[ext] || "application/octet-stream";
    }

    console.log("Final Content-Type:", contentType);

    // Get the buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(
      "File downloaded successfully, size:",
      buffer.byteLength,
      "bytes"
    );

    // Return the file with proper headers for download
    // Use RFC 5987 encoding (filename*) to support Unicode/Arabic filenames in HTTP headers
    const encodedFilename = encodeURIComponent(filename).replace(/'/g, "%27");
    const asciiFilename = filename.replace(/[^\x00-\x7F]/g, "_"); // ASCII fallback for older clients

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "no-cache",
      },
    });

  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      {
        message: "Failed to download file",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
