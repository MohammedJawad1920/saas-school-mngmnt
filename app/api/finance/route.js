
export const dynamic = "force-dynamic";

import connectToDB from "@/lib/db";
import Finance from "@/models/Finance";
import { getFinanceSummary } from "@/libservices/financeService";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectToDB();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");
    const mode = searchParams.get("mode");
    const type = searchParams.get("type");
    const accountType = searchParams.get("accountType") || "College"; // Default to College
    const accountName = searchParams.get("accountName"); // Get accountName
    console.log("Finance API GET:", { accountType, accountName, allParams: Object.fromEntries(searchParams) });
    const userHeader = req.headers.get("x-user");
    const user = userHeader ? JSON.parse(userHeader) : null;
    const activeRole = req.cookies.get("active-role")?.value;
    const isCollegeAdmin = activeRole === "College Admin";

    const page = parseInt(searchParams.get("page")) || 1;
    const limitParam = searchParams.get("limit");
    const limit = limitParam === "0" ? 0 : (parseInt(limitParam) || 20);
    const skip = limit === 0 ? 0 : (page - 1) * limit;

    let query = {};

    if (isCollegeAdmin && accountType === "College") {
      // STRICT ISOLATION: Only show records created by the current user
      query.userId = user._id;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (category && category !== "all") {
      const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.category = { $regex: escapedCategory, $options: "i" };
    }

    if (mode && mode !== "all") {
      query.mode = mode;
    }

    if (type && type !== "all") {
      query.type = type;
    }

    if (accountType) {
      query.accountType = accountType;
    }

    // Add accountName filter
    if (accountName) {
      query.accountName = accountName;
    } else if (accountType === "Org") {
      // STRICT ISOLATION: If Org and no accountName, return empty results
      // This prevents showing "all" org data mixed together
      return NextResponse.json({
        success: true,
        finance: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0
        },
        summary: {
          cashBalance: 0,
          bankBalance: 0,
          totalBalance: 0,
          totalIncome: 0,
          totalExpense: 0,
          categories: []
        }
      });
    }

    const transactions = await Finance.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (transactions.length > 0) {
      console.log("Sample fetched transaction:", {
        id: transactions[0]._id,
        item: transactions[0].item,
        recipient: transactions[0].recipient
      });
    }

    const total = await Finance.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Calculate Summary (Global Balance or Filtered Summary)
    const summaryUserId = (isCollegeAdmin && accountType === "College") ? user._id : null;
    const summary = await getFinanceSummary(accountType, accountName, summaryUserId, startDate, endDate);

    return NextResponse.json({
      success: true,
      finance: transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages
      },
      summary
    });
  } catch (error) {
    console.error("Error fetching finance data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectToDB();
    const body = await req.json();
    console.log("Finance API POST Body:", {
      ...body,
      item: body.item,
      recipient: body.recipient
    });

    const userHeader = req.headers.get("x-user");
    const user = userHeader ? JSON.parse(userHeader) : null;
    
    if (user?._id) {
        body.userId = user._id;
    }

    const newTransaction = await Finance.create(body);
    console.log("Created Transaction:", newTransaction);

    return NextResponse.json({ success: true, data: newTransaction }, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create transaction" },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    await connectToDB();
    const body = await req.json();
    const { ids, ...updateData } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "No items selected for update" },
        { status: 400 }
      );
    }

    // Remove immutable fields if present, just in case
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const userHeader = req.headers.get("x-user");
    const user = userHeader ? JSON.parse(userHeader) : null;
    const activeRole = req.cookies.get("active-role")?.value;
    const isCollegeAdmin = activeRole === "College Admin";

    const query = { _id: { $in: ids } };
    if (isCollegeAdmin && updateData.accountType !== "Org") { // If College Admin, restrict to their own records except for Org accounts
        // Wait, for College Admin, accountType is usually "College". 
        // If it's "College", we should isolate.
        query.userId = user._id;
    }

    const result = await Finance.updateMany(
      query,
      { $set: updateData }
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("PUT Transaction Error:", error);
    // Determine the error message robustly
    const errorMessage = error?.message || (typeof error === 'string' ? error : "Unknown server error");

    return NextResponse.json(
      { success: false, error: `UPDATE FAILED: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    await connectToDB();
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "No items selected for deletion" },
        { status: 400 }
      );
    }

    const userHeader = req.headers.get("x-user");
    const user = userHeader ? JSON.parse(userHeader) : null;
    const activeRole = req.cookies.get("active-role")?.value;
    const isCollegeAdmin = activeRole === "College Admin";

    const query = { _id: { $in: ids } };
    if (isCollegeAdmin) {
        query.userId = user._id;
    }

    const result = await Finance.deleteMany(query);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}