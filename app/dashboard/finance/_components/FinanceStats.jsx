
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndianRupee, Wallet, Building2, Calculator } from "lucide-react";

export default function FinanceStats({ summary }) {
    const getBalanceColor = (amount) => {
        if (!amount) return "text-foreground";
        return amount >= 0 ? "text-green-600" : "text-red-600";
    };

    return (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                    <Wallet className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold flex items-center text-green-600">
                        <IndianRupee className="h-4 w-4 mr-1" />
                        {summary?.totalIncome || 0}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expense</CardTitle>
                    <Building2 className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold flex items-center text-red-600">
                        <IndianRupee className="h-4 w-4 mr-1" />
                        {summary?.totalExpense || 0}
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-secondary border-border col-span-2 md:col-span-1">
                <CardHeader className="flex flex-row items-center justify-center md:justify-between space-y-0 gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                    <Calculator className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold flex items-center justify-center md:justify-start ${getBalanceColor(summary?.totalBalance)}`}>
                        <IndianRupee className="h-4 w-4 mr-1" />
                        {summary?.totalBalance || 0}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
