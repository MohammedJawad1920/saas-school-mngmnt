
import connectToDB from "@/lib/db";
import Finance from "@/models/Finance";

export async function getFinanceSummary(accountType = "College", accountName = null, userId = null, startDate = null, endDate = null) {
    await connectToDB();

    // Aggregation for summary
    const matchStage = { accountType }; // Filter by accountType provided

    if (userId && accountType === "College") {
        // STRICT ISOLATION: Only include records created by the current user
        matchStage.userId = userId;
    }

    if (startDate || endDate) {
        matchStage.date = {};
        if (startDate) {
            matchStage.date.$gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchStage.date.$lte = end;
        }
    }

    if (accountName) {
        matchStage.accountName = accountName;
    } else if (accountType === "Org") {
        // STRICT ISOLATION: If Org and no accountName, return simplified zero stats
        // This prevents showing "all" org data mixed together
        return {
            cashBalance: 0,
            bankBalance: 0,
            totalBalance: 0,
            totalIncome: 0,
            totalExpense: 0,
            categories: []
        };
    }

    // Main Stats Aggregation
    const stats = await Finance.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: { mode: "$mode", type: "$type" },
                total: { $sum: "$amount" }
            }
        }
    ]);

    // Category-wise Aggregation
    const categoryStats = await Finance.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: { category: "$category", type: "$type" },
                total: { $sum: "$amount" }
            }
        }
    ]);

    let cashIncome = 0;
    let cashExpense = 0;
    let bankIncome = 0;
    let bankExpense = 0;

    stats.forEach(s => {
        if (s._id.mode === "Cash") {
            if (s._id.type === "Income") cashIncome = s.total;
            if (s._id.type === "Expense") cashExpense = s.total;
        } else if (s._id.mode === "Bank") {
            if (s._id.type === "Income") bankIncome = s.total;
            if (s._id.type === "Expense") bankExpense = s.total;
        }
    });

    // Process category stats
    const categoriesMap = {};

    categoryStats.forEach(stat => {
        const category = stat._id.category;
        const type = stat._id.type;
        const total = stat.total;

        if (!categoriesMap[category]) {
            categoriesMap[category] = { category, income: 0, expense: 0, balance: 0 };
        }

        if (type === "Income") categoriesMap[category].income = total;
        if (type === "Expense") categoriesMap[category].expense = total;
    });

    // Calculate balances and convert to array
    const categories = Object.values(categoriesMap).map(cat => ({
        ...cat,
        balance: cat.income - cat.expense
    })).sort((a, b) => b.balance - a.balance); // Sort by balance descending

    const totalIncome = cashIncome + bankIncome;
    const totalExpense = cashExpense + bankExpense;

    return {
        cashBalance: cashIncome - cashExpense,
        bankBalance: bankIncome - bankExpense,
        totalBalance: (cashIncome - cashExpense) + (bankIncome - bankExpense),
        totalIncome,
        totalExpense,
        categories // Add categories to the return object
    };
}
