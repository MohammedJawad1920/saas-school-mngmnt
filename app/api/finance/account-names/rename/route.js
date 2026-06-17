import connectToDB from "@/lib/db";
import Finance from "@/models/Finance";
import AccountName from "@/models/AccountName";
import { NextResponse } from "next/server";

export async function PUT(req) {
    try {
        await connectToDB();
        const body = await req.json();
        const { oldName, newName, accountType } = body;

        if (!newName || !accountType) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        const userHeader = req.headers.get("x-user");
        const user = userHeader ? JSON.parse(userHeader) : null;
        const activeRole = req.cookies.get("active-role")?.value;
        const isCollegeAdmin = activeRole === "College Admin";

        // Determine query for finding records to update
        let query = { accountType };
        if (isCollegeAdmin && accountType === "College") {
            query.userId = user._id;
        }

        if (oldName) {
            query.accountName = oldName;
        } else {
            query.accountName = { $in: [null, ""] };
        }

        // Bulk update all transactions
        console.log(`Renaming Account [${accountType}]: '${oldName}' -> '${newName}' for user ${query.userId || "Global"}`);

        const result = await Finance.updateMany(
            query,
            { $set: { accountName: newName } }
        );

        console.log("Finance Update Result:", result);

        // Also update the AccountName persistent record
        if (oldName) {
            // Rename existing
            const accountNameQuery = { name: oldName, accountType };
            if (isCollegeAdmin && accountType === "College") {
                accountNameQuery.userId = user._id;
            }

            await AccountName.updateOne(
                accountNameQuery,
                { $set: { name: newName } }
            );
        } else {
            // "Unnamed" to "Named". Create/Upsert the new name if it doesn't exist.
            const accountNameQuery = { name: newName, accountType };
            if (isCollegeAdmin && accountType === "College") {
                accountNameQuery.userId = user._id;
            }

            const exists = await AccountName.findOne(accountNameQuery);
            if (!exists) {
                await AccountName.create({ ...accountNameQuery, userId: query.userId });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Renamed ${result.modifiedCount} transactions.`,
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error("Error renaming account name:", error);
        return NextResponse.json({ success: false, error: "Failed to rename account" }, { status: 500 });
    }
}
