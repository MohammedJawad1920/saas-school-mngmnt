import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Finance from "@/models/Finance";

export async function DELETE(req) {
    try {
        await connectToDB();
        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");
        const accountType = searchParams.get("accountType") || "College";

        if (!category) {
            return NextResponse.json(
                { success: false, error: "Category is required" },
                { status: 400 }
            );
        }

        const userHeader = req.headers.get("x-user");
        const user = userHeader ? JSON.parse(userHeader) : null;
        const activeRole = req.cookies.get("active-role")?.value;
        const isCollegeAdmin = activeRole === "College Admin";

        // Build query for isolation
        let query = { category, accountType };

        if (isCollegeAdmin && accountType === "College") {
            // STRICT ISOLATION: Only unset categories in their own isolated records
            query.userId = user._id;
        }

        // We use updateMany to UNSET the category name (set to empty string)
        // instead of deleting the transactions.
        const result = await Finance.updateMany(
            query,
            { $set: { category: "" } }
        );

        return NextResponse.json({
            success: true,
            message: `Successfully removed category name from ${result.modifiedCount} records.`,
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error("Error removing category records:", error);
        return NextResponse.json(
            { success: false, error: "Failed to remove category name" },
            { status: 500 }
        );
    }
}
