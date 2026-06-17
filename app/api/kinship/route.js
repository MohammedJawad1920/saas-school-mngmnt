import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import User from "@/models/User";

export async function PUT(req) {
  try {
    await connectToDB();
    const body = await req.json();
    const { studentId, familyDetails, familyOtherDetails } = body;

    if (!studentId) {
      return NextResponse.json({ message: "studentId is required" }, { status: 400 });
    }

    // Direct MongoDB update for maximum reliability
    const updateObj = {};
    if (familyDetails !== undefined) {
      updateObj["studentSpecificField.familyDetails"] = familyDetails;
    }
    if (familyOtherDetails !== undefined) {
      updateObj["familyOtherDetails"] = familyOtherDetails;
    }

    const result = await User.collection.updateOne(
      { _id: studentId },
      { $set: updateObj }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: "Kinship data saved successfully",
      updated: result.modifiedCount > 0
    }, { status: 200 });
  } catch (error) {
    console.error("Error saving kinship data:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
