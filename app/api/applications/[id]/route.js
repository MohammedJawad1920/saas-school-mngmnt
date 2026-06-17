import apiResponse from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import ApplicationForm from "@/models/ApplicationForm";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    const { id } = params;
    await connectToDB();

    const applicationForm = await ApplicationForm.findById(id);

    if (!applicationForm) {
      return NextResponse.json(
        { message: "Application not found!" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        applicationForm,
        message: "Application fetched successfully!",
      },
      { status: 200 }
    );
  } catch (error) {
    return apiResponse.error(error);
  }
}
