import connectToDB from "@/lib/db";
import Settings from "@/models/Settings";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDB();
    const settings = await Settings.findOne({});
    return NextResponse.json({ 
      hasFestivalNameImage: !!settings?.festival?.festivalNameImage,
      festivalNameImage: settings?.festival?.festivalNameImage,
      rawFestival: settings?.festival
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
