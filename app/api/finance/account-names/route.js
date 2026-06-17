import connectToDB from "@/lib/db";
import Finance from "@/models/Finance";
import AccountName from "@/models/AccountName";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";



export async function GET(req) {
    try {
        await connectToDB();
        const { searchParams } = new URL(req.url);
        const accountType = searchParams.get("accountType");

        if (!accountType) {
            return NextResponse.json({ success: false, error: "Account Type is required" }, { status: 400 });
        }

        const userHeader = req.headers.get("x-user");
        const user = userHeader ? JSON.parse(userHeader) : null;
        const activeRole = req.cookies.get("active-role")?.value;
        const isCollegeAdmin = activeRole === "College Admin";

        const query = { accountType };
        if (isCollegeAdmin && accountType === "College") {
            query.userId = user._id;
        }

        // Try fetching from AccountName collection first
        let accountNames = await AccountName.find(query).select("name").sort({ name: 1 });
        let names = accountNames.map(a => a.name);

        // Lazy Migration: If empty, fetch from Finance and populate
        if (names.length === 0) {
            const existingNames = await Finance.distinct("accountName", query);
            const validExisting = existingNames.filter(n => n && n.trim() !== "");

            if (validExisting.length > 0) {
                // Bulk insert
                const docs = validExisting.map(name => ({ name, accountType, userId: query.userId }));
                try {
                    await AccountName.insertMany(docs, { ordered: false });
                } catch (e) {
                    console.log("Migration duplicate skipped");
                }
                names = validExisting.sort();
            }
        }

        return NextResponse.json({ success: true, accountNames: names });
    } catch (error) {
        console.error("Error fetching account names:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch account names" }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectToDB();
        const body = await req.json();
        const { name, accountType } = body;

        if (!name || !accountType) {
            return NextResponse.json({ success: false, error: "Name and Account Type are required" }, { status: 400 });
        }

        const userHeader = req.headers.get("x-user");
        const user = userHeader ? JSON.parse(userHeader) : null;
        const userId = user?._id || null;

        // Check if exists
        const exists = await AccountName.findOne({ name, accountType, userId });
        if (exists) {
            return NextResponse.json({ success: true, message: "Account Name already exists" });
        }

        await AccountName.create({ name, accountType, userId });

        return NextResponse.json({ success: true, message: "Account Name created" });
    } catch (error) {
        console.error("Error creating account name:", error);
        return NextResponse.json({ success: false, error: error.message || "Failed to create account name" }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await connectToDB();
        const { searchParams } = new URL(req.url);
        const name = searchParams.get("name");
        const accountType = searchParams.get("accountType");

        if (!name || !accountType) {
            return NextResponse.json({ success: false, error: "Name and Account Type are required" }, { status: 400 });
        }

        const userHeader = req.headers.get("x-user");
        const user = userHeader ? JSON.parse(userHeader) : null;
        const activeRole = req.cookies.get("active-role")?.value;
        const isCollegeAdmin = activeRole === "College Admin";

        const query = { name, accountType };
        if (isCollegeAdmin && accountType === "College") {
            query.userId = user._id;
        }

        const result = await AccountName.deleteOne(query);

        return NextResponse.json({ success: true, message: "Account Name deleted" });
    } catch (error) {
        console.error("Error deleting account name:", error);
        return NextResponse.json({ success: false, error: "Failed to delete account name" }, { status: 500 });
    }
}
