import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Debtor from "@/models/Debtor";
import DebtCategory from "@/models/DebtCategory";

export const dynamic = "force-dynamic";

// GET — list debts with filters
export async function GET(req) {
  try {
    await connectToDB();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const batchId   = searchParams.get("batchId");
    const classId   = searchParams.get("classId");
    const category  = searchParams.get("category");
    const year      = searchParams.get("year");

    const query = {};
    if (studentId) query.studentId = studentId;
    if (batchId)   query.batchId   = batchId;
    if (classId)   query.classId   = classId;
    if (category)  query.category  = category;
    if (year)      query.year      = year;

    const debts = await Debtor.find(query)
      .populate("studentId", "name studentSpecificField.admissionNumber")
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
    return NextResponse.json({ success: true, debts });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST — create a new debt entry
export async function POST(req) {
  try {
    await connectToDB();
    const body = await req.json();
    const { studentId, batchId, classId, category, year, totalAmount, note } = body;

    const userHeader = req.headers.get("x-user");
    const user = userHeader ? JSON.parse(userHeader) : null;

    const debt = await Debtor.create({
      studentId, batchId, classId, category: category.trim().toUpperCase(), year,
      totalAmount: Number(totalAmount),
      note,
      payments: [],
      createdBy: user?.id,
    });

    // Auto-create category if it doesn't exist
    const existingCategory = await DebtCategory.findOne({ name: category.trim().toUpperCase() });
    if (!existingCategory) {
      await DebtCategory.create({ name: category.trim().toUpperCase() });
    }

    return NextResponse.json({ success: true, debt }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT — add a payment OR update debt fields
export async function PUT(req) {
  try {
    await connectToDB();
    const body = await req.json();
    const { id, payment, ...updateFields } = body;
    if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

    const userHeader = req.headers.get("x-user");
    const user = userHeader ? JSON.parse(userHeader) : null;

    let debt = await Debtor.findById(id);
    if (!debt) return NextResponse.json({ success: false, error: "Debt not found" }, { status: 404 });

    if (payment) {
      // Add payment
      debt.payments.push({ ...payment, paidBy: user?.id });
    } else {
      // Update debt fields
      Object.assign(debt, updateFields);
    }
    await debt.save();
    const updated = debt.toObject({ virtuals: true });
    return NextResponse.json({ success: true, debt: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE — remove debt records
export async function DELETE(req) {
  try {
    await connectToDB();
    const { ids } = await req.json(); // array of IDs
    if (!ids || !Array.isArray(ids)) {
       return NextResponse.json({ success: false, error: "Invalid IDs array" }, { status: 400 });
    }
    await Debtor.deleteMany({ _id: { $in: ids } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
