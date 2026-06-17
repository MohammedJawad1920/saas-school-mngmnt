import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import CustomRole from "@/models/CustomRole";
import { NextResponse } from "next/server";

export async function POST(req, res) {
  try {
    await connectToDB();
    const { userId } = await req.json();

    let user = null;
    let customRoleNames = [];

    if (userId.includes("@")) {
      const emailLower = userId.toLowerCase();
      const [userDoc, customRoles] = await Promise.all([
        User.findOne({ email: emailLower }).lean(),
        CustomRole.find({ "members.email": emailLower }).select("name").lean(),
      ]);
      user = userDoc;
      customRoleNames = customRoles.map((r) => r.name);
    } else {
      user = await User.findById(userId).lean();
      const email = user?.email;
      if (email) {
        const customRoles = await CustomRole.find({
          "members.email": email.toLowerCase(),
        }).select("name").lean();
        customRoleNames = customRoles.map((r) => r.name);
      }
    }

    if (!user) {
      // If not a standard user, check if they are at least a member of a custom role
      if (customRoleNames.length > 0) {
        user = {
          _id: userId,
          userId: userId,
          name: userId.split("@")[0].toUpperCase(),
          email: userId,
          roles: customRoleNames,
        };
      } else {
        return NextResponse.json({ user: null }, { status: 404 });
      }
    } else {
      // Merge custom roles into existing user object
      const allRoles = new Set([
        ...(user.roles || []),
        ...customRoleNames,
      ]);
      user.roles = Array.from(allRoles);
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    return apiResponse.error(error);
  }
}
