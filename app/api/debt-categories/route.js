import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import DebtCategory from "@/models/DebtCategory";

export async function GET() {
  await connectToDB();
  const categories = await DebtCategory.find().sort({ name: 1 });
  return NextResponse.json({ success: true, categories });
}

export async function POST(req) {
  try {
    await connectToDB();
    const { name } = await req.json();
    if (!name) return NextResponse.json({ success: false, error: "Name required" }, { status: 400 });
    const existing = await DebtCategory.findOne({ name: name.trim().toUpperCase() });
    if (existing) return NextResponse.json({ success: false, error: "Category already exists" }, { status: 409 });
    const category = await DebtCategory.create({ name: name.trim().toUpperCase() });
    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await connectToDB();
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");
    await DebtCategory.deleteOne({ name: name.trim().toUpperCase() });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
