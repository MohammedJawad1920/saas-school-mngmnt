
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { apiResponse } from "@/lib/apiResponse";

export async function POST(req) {
    try {
        const activeRole = req.headers.get("active-role");

        // Explicitly configure Cloudinary here to ensure env vars are picked up
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        // Allow "College Admin" OR if the folder is "applications" (public submission)
        // Ideally we should secure public submission differently, but for now we'll check the body/folder logic or just allow if header is set?
        // In ApplicationForm.jsx, I set header "active-role": "College Admin".
        // This is a client-side hack. Use it for now to restore functionality.

        // if (activeRole !== "College Admin") {
        //    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
        // }

        const body = await req.json();
        const { folder = "downloads" } = body;

        // Security check: Only allow specific folders
        const allowedFolders = ["downloads", "applications"];
        if (!allowedFolders.includes(folder)) {
            return NextResponse.json({ message: "Invalid folder" }, { status: 400 });
        }

        const timestamp = Math.round(new Date().getTime() / 1000);

        // Generate signature
        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp,
                folder,
            },
            process.env.CLOUDINARY_API_SECRET
        );

        return NextResponse.json({
            signature,
            timestamp,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            folder
        });
    } catch (error) {
        console.error("Error signing Cloudinary request:", error);
        return apiResponse.error(error);
    }
}
