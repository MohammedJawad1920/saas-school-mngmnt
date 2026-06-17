import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { parseUser } from "@/lib/utils";
import User from "@/models/User";
import connectToDB from "@/lib/db";

export async function POST(req) {
  try {
    await connectToDB();
    const headerStore = await headers();
    const user = parseUser(headerStore);

    if (!user || !user._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription object" },
        { status: 400 }
      );
    }

    // Find the user and ensure the subscription isn't already there
    const existingUser = await User.findById(user._id);
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentSubs = existingUser.pushSubscriptions || [];
    
    // Check if subscription with same endpoint already exists
    const exists = currentSubs.some((s) => s.endpoint === subscription.endpoint);
    
    if (!exists) {
      // Add the new subscription
      currentSubs.push(subscription);
      await User.findByIdAndUpdate(user._id, {
        pushSubscriptions: currentSubs,
      });
    }

    return NextResponse.json({ success: true, message: "Subscription saved" });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
