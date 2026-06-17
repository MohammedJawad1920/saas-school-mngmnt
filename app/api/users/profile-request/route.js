import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import User from "@/models/User";

export async function PUT(req) {
  try {
    await connectToDB();
    const body = await req.json();
    const { userId, pendingChanges } = body;

    if (!userId) {
      return NextResponse.json({ message: "userId is required" }, { status: 400 });
    }

    await User.updateOne(
      { _id: userId },
      { 
        $set: { 
          pendingProfileUpdate: pendingChanges,
          profileUpdateStatus: "Pending",
          profileRequestDate: new Date()
        } 
      }
    );

    return NextResponse.json({ message: "Update request submitted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error submitting profile request:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectToDB();
    const body = await req.json();
    const { userId, action, approvedFields } = body;

    if (!userId) {
      return NextResponse.json({ message: "userId is required" }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (action === "approve") {
      const pendingChanges = user.pendingProfileUpdate;
      if (!pendingChanges) {
        return NextResponse.json({ message: "No pending changes found" }, { status: 400 });
      }

      // If specific fields are provided, only update those
      const changesToApply = {};
      if (approvedFields !== undefined) {
        approvedFields.forEach(fieldPath => {
          // Resolve value from pendingChanges
          const parts = fieldPath.split('.');
          let val = pendingChanges;
          for (const part of parts) {
            val = val?.[part];
          }
          if (val !== undefined) {
            changesToApply[fieldPath] = val;
          }
        });
      } else {
        // Fallback to all changes if none specified (old behavior)
        // Map top level fields
        ["name", "email", "contactNumber", "alternativeNumber", "dateOfBirth"].forEach((field) => {
          if (pendingChanges[field] !== undefined) changesToApply[field] = pendingChanges[field];
        });

        // Map studentSpecificField
        if (pendingChanges.studentSpecificField) {
          for (const [key, value] of Object.entries(pendingChanges.studentSpecificField)) {
            changesToApply[`studentSpecificField.${key}`] = value;
          }
        }

        // Map address
        if (pendingChanges.address) {
          for (const [key, value] of Object.entries(pendingChanges.address)) {
            changesToApply[`address.${key}`] = value;
          }
        }
      }

      const updateObj = {
        ...changesToApply,
        profileUpdateStatus: "Verified",
        pendingProfileUpdate: null,
        profileActionDate: new Date()
      };

      await User.updateOne({ _id: userId }, { $set: updateObj });
      return NextResponse.json({ message: "Profile update approved and applied" });
    } else if (action === "reject") {
      await User.updateOne(
        { _id: userId },
        { 
          $set: { 
            pendingProfileUpdate: null,
            profileUpdateStatus: "Rejected",
            profileActionDate: new Date()
          } 
        }
      );
      return NextResponse.json({ message: "Profile update request rejected" });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error processing profile request:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return NextResponse.json(
        { message: `A user with this ${field} already exists.` },
        { status: 400 }
      );
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors || {}).map((err) => err.message);
      return NextResponse.json(
        { message: messages.join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
