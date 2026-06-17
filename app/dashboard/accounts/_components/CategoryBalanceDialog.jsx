import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollText, Printer, IndianRupee } from "lucide-react";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function CategoryBalanceDialog({ categories, totalBalance }) {
    const componentRef = useRef();
    const [filterType, setFilterType] = useState("All");

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Category Balance Summary - ${filterType}`,
    });

    const filteredCategories = useMemo(() => {
        if (filterType === "All") return categories || [];
        if (filterType === "Income") return categories?.filter(c => c.income > 0) || [];
        if (filterType === "Expense") return categories?.filter(c => c.expense > 0) || [];
        return categories || [];
    }, [categories, filterType]);

    const showIncome = filterType === "All" || filterType === "Income";
    const showExpense = filterType === "All" || filterType === "Expense";
    const showBalance = filterType === "All";

    const totalIncome = filteredCategories.reduce((acc, curr) => acc + curr.income, 0);
    const totalExpense = filteredCategories.reduce((acc, curr) => acc + curr.expense, 0);
    // For filtered views, balance is typically just (Income - Expense) of filtered items
    // But if we hide expense column, does "Balance" make sense?
    // If we show only Income rows, Balance = Income - 0 = Income.
    // Let's keep logic simple: Sum of displayed rows.
    const currentTotalBalance = totalIncome - totalExpense;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="ml-2">
                    <ScrollText className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Balance Summary</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Category Balance Summary</DialogTitle>
                </DialogHeader>

                <div className="flex justify-between items-center mb-4">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Categories</SelectItem>
                            <SelectItem value="Income">Income Only</SelectItem>
                            <SelectItem value="Expense">Expense Only</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button onClick={handlePrint} className="btn-print">
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                </div>

                <div ref={componentRef} className="p-4 bg-white">
                    <div className="mb-4 text-center print:block hidden">
                        <h2 className="text-xl font-bold">Category Balance Summary {filterType !== "All" ? `(${filterType})` : ""}</h2>
                        <p className="text-sm text-gray-500">{new Date().toLocaleDateString()}</p>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">Sl No</TableHead>
                                <TableHead>Category</TableHead>
                                {showIncome && <TableHead className="text-right">Income</TableHead>}
                                {showExpense && <TableHead className="text-right">Expense</TableHead>}
                                {showBalance && <TableHead className="text-right">Balance</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCategories.map((cat, index) => (
                                <TableRow key={cat.category}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-medium">{cat.category}</TableCell>
                                    {showIncome && (
                                        <TableCell className="text-right text-green-600">
                                            <div className="flex items-center justify-end">
                                                <IndianRupee className="h-3 w-3 mr-1" />
                                                {cat.income}
                                            </div>
                                        </TableCell>
                                    )}
                                    {showExpense && (
                                        <TableCell className="text-right text-red-600">
                                            <div className="flex items-center justify-end">
                                                <IndianRupee className="h-3 w-3 mr-1" />
                                                {cat.expense}
                                            </div>
                                        </TableCell>
                                    )}
                                    {showBalance && (
                                        <TableCell className={`text-right font-bold ${cat.balance >= 0 ? "text-green-700" : "text-red-700"}`}>
                                            <div className="flex items-center justify-end">
                                                <IndianRupee className="h-3 w-3 mr-1" />
                                                {cat.balance}
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                            {/* Grand Total Row */}
                            <TableRow className="bg-muted/50 font-bold border-t-2">
                                <TableCell colSpan={2}>Grand Total</TableCell>
                                {showIncome && (
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end">
                                            <IndianRupee className="h-3 w-3 mr-1" />
                                            {totalIncome}
                                        </div>
                                    </TableCell>
                                )}
                                {showExpense && (
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end">
                                            <IndianRupee className="h-3 w-3 mr-1" />
                                            {totalExpense}
                                        </div>
                                    </TableCell>
                                )}
                                {showBalance && (
                                    <TableCell className="text-right text-emerald-600">
                                        <div className="flex items-center justify-end">
                                            <IndianRupee className="h-3 w-3 mr-1" />
                                            {filterType === "All" ? totalBalance : currentTotalBalance}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </DialogContent>
        </Dialog>
    );
}
