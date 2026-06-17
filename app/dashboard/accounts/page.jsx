
import connectToDB from "@/lib/db";
import Finance from "@/models/Finance";
import { getFinanceSummary } from "@/libservices/financeService";
import AccountsClient from "./AccountsClient";

export const dynamic = "force-dynamic"; // Ensure real-time updates

import { cookies, headers } from "next/headers";

export default async function AccountsPage({ searchParams }) {
    const cookieStore = await cookies();
    const activeRole = cookieStore.get("active-role")?.value;
    const { accountName, startDate, endDate } = await searchParams;

    let accountType = "College";
    if (activeRole === "Org Admin") {
        accountType = "Org";
    }

    let summary = null;
    let allCategories = [];
    try {
        const userHeader = (await headers()).get("x-user");
        const user = userHeader ? JSON.parse(userHeader) : null;
        const isCollegeAdmin = activeRole === "College Admin";
        const currentUserId = (isCollegeAdmin && user?._id) ? user._id : null;

        summary = await getFinanceSummary(accountType, accountName, currentUserId, startDate, endDate);

        // Fetch all categories for this accountType and user isolated context
        await connectToDB();
        const categoryQuery = { accountType };
        if (currentUserId && accountType === "College") {
            // STRICT ISOLATION: Only show categories used by the current user
            categoryQuery.userId = currentUserId;
        }
        allCategories = await Finance.distinct("category", categoryQuery);
        allCategories = allCategories.filter(Boolean); // Remove empty/null categories
    } catch (error) {
        console.error("Error fetching finance summary:", error);
        // Fallback or handle error gracefully so page doesn't crash
    }
    // Prioritize API_KEY since we are on the server, ensuring we match what middleware expects
    const apiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY;

    return (
        <div className="p-2 space-y-4">
            <div className="mb-2">
                <h1 className="font-bold text-xl md:text-2xl tracking-tight uppercase">ACCOUNTS {accountType !== "College" ? `(${accountType})` : ""}</h1>
                <p className="text-muted-foreground">Manage your financial transactions</p>
            </div>
            <AccountsClient activeRole={activeRole} initialSummary={summary} apiKey={apiKey} accountType={accountType} accountName={accountName} allCategories={allCategories} />
        </div>
    );
}
