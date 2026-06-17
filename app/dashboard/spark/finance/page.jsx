import AccountsClient from "@/app/dashboard/accounts/AccountsClient";
import { getFinanceSummary } from "@/libservices/financeService";

export const dynamic = "force-dynamic";

export default async function SparkFinancePage() {
    // Reuse finance summary logic
    const accountType = "Spark";
    const summary = await getFinanceSummary(accountType);
    const apiKey = process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY;

    return (
        <div className="p-2 space-y-4">
            <div className="mb-2">
                <h1 className="font-bold text-xl md:text-2xl tracking-tight uppercase">SPARK FINANCE</h1>
                <p className="text-muted-foreground">Manage Spark financial transactions</p>
            </div>
            {/* Reuse the AccountsClient component */}
            <AccountsClient initialSummary={summary} apiKey={apiKey} accountType={accountType} />
        </div>
    );
}
