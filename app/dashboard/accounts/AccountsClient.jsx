"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import FinanceStats from "@/app/dashboard/finance/_components/FinanceStats";
import DataTableComponent from "@/components/DataTableComponent";
import TransactionForm from "./_components/TransactionForm";
import { IndianRupee, Printer, ChevronLeft, ChevronRight, ChevronsUpDown, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import PrintableReceipt from "./_components/PrintableReceipt";
import PrintableVoucher from "./_components/PrintableVoucher";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import CategoryBalanceDialog from "./_components/CategoryBalanceDialog";
import PrintAllDocsButton from "./_components/PrintAllDocsButton";

export default function AccountsClient({ activeRole, initialSummary, apiKey, accountType = "College", accountName: initialAccountName = "", allCategories = [] }) {
    const [summary, setSummary] = useState(initialSummary);
    const [transactions, setTransactions] = useState([]);
    const router = useRouter();
    const [accountName, setAccountName] = useState(initialAccountName || "");
    const [availableAccountNames, setAvailableAccountNames] = useState([]);
    const [openAccountCombobox, setOpenAccountCombobox] = useState(false);

    const handleAccountNameChange = (newName) => {
        setAccountName(newName);

        // If it's a new name not in the list (and not empty), add it locally so it shows in dropdown/navigation
        if (newName && !availableAccountNames.includes(newName)) {
            setAvailableAccountNames(prev => Array.from(new Set([...prev, newName])).sort());
        }

        // Persist to URL
        const params = new URLSearchParams(window.location.search);
        if (newName) {
            params.set("accountName", newName);
        } else {
            params.delete("accountName");
        }
        router.push(`?${params.toString()}`);
    };

    useEffect(() => {
        setSummary(initialSummary);
    }, [initialSummary]);

    useEffect(() => {
        setAccountName(initialAccountName || "");
    }, [initialAccountName]);

    const getCurrentFinYear = () => {
        const today = new Date();
        const month = today.getMonth(); // 0-indexed
        const year = today.getFullYear();
        if (month >= 3) {
            return `${year}-${year + 1}`;
        } else {
            return `${year - 1}-${year}`;
        }
    };

    // Fetch available account names
    useEffect(() => {
        if (accountType === "Org" || accountType === "College" || accountType === "Spark") {
            fetch(`/api/finance/account-names?accountType=${accountType}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setAvailableAccountNames(data.accountNames);
                        // Default to current year if none selected
                        if (!accountName && !initialAccountName && data.accountNames.length > 0) {
                            const currentFinYear = getCurrentFinYear();
                            const exactMatch = data.accountNames.find(name => name.includes(currentFinYear));
                            const currentYearNumMatch = data.accountNames.find(name => name.includes(new Date().getFullYear().toString()));

                            if (exactMatch) {
                                handleAccountNameChange(exactMatch);
                            } else if (currentYearNumMatch) {
                                handleAccountNameChange(currentYearNumMatch);
                            } else {
                                // Default to the latest year (last one alphabetically) if current year mismatch
                                handleAccountNameChange(data.accountNames[data.accountNames.length - 1]);
                            }
                        }
                    }
                })
                .catch(err => console.error("Failed to fetch account names", err));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountType, initialAccountName]);

    const [isEditingName, setIsEditingName] = useState(false);
    const [isCreatingName, setIsCreatingName] = useState(false);
    const [editingAccountName, setEditingAccountName] = useState("");
    const [renaming, setRenaming] = useState(false);
    const editInputRef = useRef(null);

    useEffect(() => {
        if (isEditingName || isCreatingName) {
            // Small timeout to ensure render
            setTimeout(() => editInputRef.current?.focus(), 50);
        }
    }, [isEditingName, isCreatingName]);

    const handleRenameAccount = async () => {
        if (!editingAccountName || !editingAccountName.trim()) {
            setIsEditingName(false);
            setIsCreatingName(false);
            return;
        }

        if (isCreatingName) {
            setRenaming(true);
            try {
                // Create new account name via API
                const res = await fetch("/api/finance/account-names", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: editingAccountName, accountType })
                });
                const data = await res.json();

                if (data.success) {
                    // Update state
                    handleAccountNameChange(editingAccountName, true);
                    setAvailableAccountNames(prev => {
                        const merged = [...prev];
                        if (!merged.includes(editingAccountName)) {
                            merged.push(editingAccountName);
                        }
                        return merged.sort();
                    });
                    setIsCreatingName(false);
                    setEditingAccountName("");
                } else {
                    console.error("Failed to create:", data.error);
                }
            } catch (err) {
                console.error("Error creating account:", err);
            } finally {
                setRenaming(false);
            }
            return;
        }

        if (editingAccountName === accountName) {
            setIsEditingName(false);
            return;
        }

        setRenaming(true);
        try {
            const res = await fetch("/api/finance/account-names/rename", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    oldName: accountName,
                    newName: editingAccountName,
                    accountType
                })
            });
            const data = await res.json();
            if (data.success) {
                // Update URL to new name
                handleAccountNameChange(editingAccountName, true); // true arg to indicate replaced name

                // Update local list immediately to reflect rename in dropdown
                setAvailableAccountNames(prev => {
                    const updated = prev.map(n => n === accountName ? editingAccountName : n);
                    return Array.from(new Set(updated)).sort();
                });

                setIsEditingName(false);
                // Refresh list
                fetch(`/api/finance/account-names?accountType=Org`)
                    .then(res => res.json())
                    .then(d => {
                        if (d.success) {
                            // Ensure the renamed name is present in the fetched list
                            setAvailableAccountNames(fetchedList => {
                                // fetchedList argument here is ignored as we use d.accountNames, 
                                // but we want to merge d.accountNames with existing editingAccountName
                                const merged = [...d.accountNames];
                                if (!merged.includes(editingAccountName)) {
                                    merged.push(editingAccountName);
                                }
                                return merged.sort();
                            });
                        }
                    });
            } else {
                console.error("Failed to rename:", data.error);
                // Optionally show error toast
            }
        } catch (error) {
            console.error("Error renaming:", error);
        } finally {
            setRenaming(false);
        }
    };

    const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
    const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteAccount = () => {
        setDeleteConfirmationInput("");
        setDeleteConfirmationOpen(true);
    };

    const confirmDelete = async () => {
        if (deleteConfirmationInput !== "DELETE") return;

        setIsDeleting(true);
        try {
            const res = await fetch(`/api/finance/account-names?name=${encodeURIComponent(accountName)}&accountType=${accountType}`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (data.success) {
                // Update local list
                setAvailableAccountNames(prev => prev.filter(n => n !== accountName));
                handleAccountNameChange(""); // Deselect
                setIsEditingName(false);
                setDeleteConfirmationOpen(false);
            } else {
                alert("Failed to delete: " + data.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleNextPrevAccount = (direction) => {
        if (!availableAccountNames.length) return;
        const currentIndex = availableAccountNames.indexOf(accountName);
        let nextIndex;
        if (direction === "next") {
            nextIndex = (currentIndex + 1) % availableAccountNames.length;
        } else {
            nextIndex = (currentIndex - 1 + availableAccountNames.length) % availableAccountNames.length;
        }
        handleAccountNameChange(availableAccountNames[nextIndex]);
    };

    // Custom Filter States
    // Filter Config for PopupFilter
    const filterConfig = [
        {
            id: "dateRange",
            label: "Date Range",
            inputType: "dateRange",
        },
        {
            id: "category",
            label: "Category",
            inputType: "select",
            options: summary?.categories?.map(c => ({ value: c.category, label: c.category })) || []
        },
        {
            id: "type",
            label: "Type",
            inputType: "select",
            options: [
                { value: "Income", label: "Income" },
                { value: "Expense", label: "Expense" },
            ]
        },
        {
            id: "mode",
            label: "Mode",
            inputType: "select",
            options: [
                { value: "Cash", label: "Cash" },
                { value: "Bank", label: "Bank" },
            ]
        }
    ];

    const handleDataFetched = useCallback((data) => {
        if (data?.summary) {
            setSummary(data.summary);
        }
        if (data?.finance) {
            setTransactions(data.finance);
        }
    }, []);

    const handleSuccess = useCallback(() => {
        router.refresh();
        // Force DataTable refresh by updating key
        setRefreshKey(prev => prev + 1);
        // Re-fetch account names in case a new one was added
        if (accountType === "Org" || accountType === "College" || accountType === "Spark") {
            fetch(`/api/finance/account-names?accountType=${accountType}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setAvailableAccountNames(data.accountNames);
                    }
                });
        }
    }, [router, accountType]);

    const [refreshKey, setRefreshKey] = useState(0);
    const [printTransaction, setPrintTransaction] = useState(null);
    const [printDialogType, setPrintDialogType] = useState(null); // "receipt" | "voucher"

    const handleOpenPrint = (transaction) => {
        setPrintTransaction(transaction);
        setPrintDialogType(transaction.type === "Income" ? "receipt" : "voucher");
    };

    const handleClosePrint = () => {
        setPrintTransaction(null);
        setPrintDialogType(null);
    };


    const columnsConfig = [
        {
            accessorKey: "select",
            header: "Select",
            type: "checkbox",
            width: "50px",
            minWidth: "50px",
        },
        {
            id: "slNo",
            header: "Sl No",
            cell: ({ row, table }) => {
                const pageIndex = table.getState().pagination.pageIndex;
                const pageSize = table.getState().pagination.pageSize;
                return pageIndex * pageSize + row.index + 1;
            },
            enableSorting: false,
            width: "50px",
            minWidth: "50px",
        },
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ row }) => new Date(row.original.date).toLocaleDateString("en-GB"),
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => (
                <span className={row.original.type === "Income" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {row.original.type}
                </span>
            )
        },
        {
            accessorKey: "mode",
            header: "Mode",
            cell: ({ row }) => row.original.mode,
        },
        {
            accessorKey: "invoiceNo",
            header: "Invoice/Receipt",
        },
        {
            accessorKey: "item",
            header: "Item",
            minWidth: "150px",
            cell: ({ row }) => row.original.item || "-",
        },
        {
            accessorKey: "recipient",
            header: "Recipient/Payee",
            minWidth: "150px",
            cell: ({ row }) => row.original.recipient || "-",
        },
        {
            accessorKey: "category",
            header: "Category",
        },
        {
            accessorKey: "amount",
            header: "Amount",
            cell: ({ row }) => (
                <div className="flex items-center">
                    <IndianRupee className="h-3 w-3 mr-1" />
                    {row.original.amount}
                </div>
            )
        },
        {
            id: "printDoc",
            header: "Receipt/Voucher",
            enableSorting: false,
            width: "130px",
            minWidth: "120px",
            meta: { className: "print:hidden" },
            cell: ({ row }) => (
                row.original.type === "Income" ? (
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-green-700 border-green-300 hover:bg-green-50 hover:text-green-800 gap-1 text-xs px-2 py-1 h-7"
                        onClick={() => handleOpenPrint(row.original)}
                    >
                        <Printer className="h-3 w-3" />
                        Receipt
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-700 border-blue-300 hover:bg-blue-50 hover:text-blue-800 gap-1 text-xs px-2 py-1 h-7"
                        onClick={() => handleOpenPrint(row.original)}
                    >
                        <Printer className="h-3 w-3" />
                        Voucher
                    </Button>
                )
            )
        },
        // We might want to show accountName column if in Org view and no specific account selected?
        // But the requirement is to filter. Let's keep it simple.
    ];

    // We still provide formFields for Edit actions, as we want the PopupForm for editing.
    const formFields = [
        { name: "date", label: "Date", type: "date", required: true },
        {
            name: "type",
            label: "Income/Expense",
            type: "text",
            inputType: "select",
            options: [
                { value: "Income", label: "Income" },
                { value: "Expense", label: "Expense" },
            ],
            required: true,
        },
        { name: "invoiceNo", label: "Invoice/Receipt No", type: "text", required: true },
        { name: "item", label: "Item", type: "text", required: false },
        { name: "recipient", label: "Recipient/Payee", type: "text", required: false },
        {
            name: "category",
            label: "Category",
            type: "text",
            inputType: "select",
            options: allCategories?.length > 0
                ? allCategories.map(c => ({ value: c, label: c }))
                : summary?.categories?.map(c => ({ value: c.category, label: c.category })) || [],

            required: true,
            freeSolo: true
        },
        {
            name: "mode",
            label: "Mode",
            type: "text",
            inputType: "select",
            options: [
                { value: "Cash", label: "Cash" },
                { value: "Bank", label: "Bank" },
            ],
            required: true,
        },
        { name: "amount", label: "Amount", type: "number", required: true },
        // Edit form needs to know about accountName? 
        // Typically edits happen in the context of the current view.
        // If we want to allow editing accountName, we'd add it here.
        // For now, let's assume transactions stay in their account.
        // But if creating via popup (which is disabled here, we use TransactionForm), it would need it.
        // Since enableCreate={false}, this formFields is mostly for Edit.
    ];

    return (
        <div className="space-y-6">
            {(accountType === "Org" || accountType === "College" || accountType === "Spark") && (
                <div className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-card p-4 rounded-lg shadow-sm border">

                    {/* Prev Button - Order 1 */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleNextPrevAccount("prev")}
                        className="order-1 shrink-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Input Area - Order 2 on Mobile/Desktop */}
                    <div className="order-2 flex-1 min-w-[200px]">
                        {isEditingName || isCreatingName ? (
                            <Input
                                ref={editInputRef}
                                value={editingAccountName}
                                onChange={(e) => setEditingAccountName(e.target.value)}
                                placeholder={isCreatingName ? "Enter new account name" : "Rename account"}
                                className="w-full"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenameAccount();
                                }}
                            />
                        ) : (
                            <Popover open={openAccountCombobox} onOpenChange={setOpenAccountCombobox}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openAccountCombobox}
                                        className="w-full justify-between"
                                    >
                                        {accountName || "Select or Type Account Name..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput
                                            placeholder="Search or add account..."
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleAccountNameChange(e.currentTarget.value);
                                                    setOpenAccountCombobox(false);
                                                }
                                            }}
                                        />
                                        <CommandList>
                                            <CommandEmpty>Press Enter to add "{accountName}"</CommandEmpty>
                                            <CommandGroup>
                                                {availableAccountNames.map((name) => (
                                                    <CommandItem
                                                        key={name}
                                                        value={name}
                                                        onSelect={(currentValue) => {
                                                            handleAccountNameChange(currentValue === accountName ? "" : currentValue);
                                                            setOpenAccountCombobox(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                accountName === name ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>

                    {/* Next Button - Order 3 */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleNextPrevAccount("next")}
                        className="order-3 shrink-0"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>

                    {/* Action Buttons - Order 4 */}
                    <div className="order-4 w-full md:w-auto flex items-center justify-center md:justify-start gap-2 mt-2 md:mt-0">
                        {isEditingName || isCreatingName ? (
                            <>
                                <Button size="sm" onClick={handleRenameAccount} disabled={renaming}>
                                    {renaming ? "Saving..." : "Save"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => {
                                    setIsEditingName(false);
                                    setIsCreatingName(false);
                                }}>
                                    Cancel
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" size="sm" onClick={() => {
                                    setEditingAccountName("");
                                    setIsCreatingName(true);
                                }} title="Add New Account">
                                    <Plus className="h-4 w-4 text-muted-foreground" />
                                    <span className="md:hidden ml-2">Add</span>
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => {
                                    setEditingAccountName(accountName || "");
                                    setIsEditingName(true);
                                }} title="Rename Account">
                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                    <span className="md:hidden ml-2">Edit</span>
                                </Button>
                                {accountName && (
                                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={handleDeleteAccount} title="Delete Account">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="md:hidden ml-2">Delete</span>
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            <FinanceStats summary={summary} />

            <TransactionForm
                apiKey={apiKey}
                onSuccess={handleSuccess}
                accountType={accountType}
                existingCategories={allCategories?.length > 0 ? allCategories : summary?.categories?.map(c => c.category) || []}
                accountName={accountName}
            />

            <DataTableComponent
                tableHeight="calc(100vh - 140px)"
                resource="finance"
                apiEndpoint="finance"
                columnsConfig={columnsConfig}
                formFields={formFields}
                apiKey={apiKey}
                filterType="api"
                enableDelete={true}
                enableCreate={false} // Disable built-in add button
                createFormTitle="Add Transaction"
                editFormTitle="Edit Transaction"
                apiFilters={{ accountType, accountName, refreshKey }} // Pass accountType, accountName and refreshKey for filtering
                additionalFormParams={{ accountType, accountName }} // For creation if we enabled it here
                additionalProps={{
                    customActions: (
                        <div className="flex items-center gap-2">
                            {transactions?.length > 0 && (
                                <PrintAllDocsButton transactions={transactions} apiKey={apiKey} />
                            )}
                            {summary?.categories && (
                                <CategoryBalanceDialog categories={summary.categories} totalBalance={summary.totalBalance} />
                            )}
                        </div>
                    ),
                    accountType // Keep accountType here if needed by other logic
                }}
                filterConfig={filterConfig}
                printInReverse={true}
                printTitle={`Accounts ${accountName ? `- ${accountName}` : ""}`}
                limit={0}
                onSuccess={handleSuccess}
                onDataFetched={handleDataFetched}
            />

            {/* Printable Receipt / Voucher Dialogs */}
            <PrintableReceipt
                transaction={printDialogType === "receipt" ? printTransaction : null}
                open={printDialogType === "receipt"}
                onClose={handleClosePrint}
                apiKey={apiKey}
            />
            <PrintableVoucher
                transaction={printDialogType === "voucher" ? printTransaction : null}
                open={printDialogType === "voucher"}
                onClose={handleClosePrint}
                apiKey={apiKey}
            />

            <Dialog open={deleteConfirmationOpen} onOpenChange={setDeleteConfirmationOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Account Year</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong>{accountName}</strong>? All transactions associated with this account year will be hidden/unnamed. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="confirm-delete" className="col-span-4 text-sm font-medium text-gray-700">
                                Type <strong>DELETE</strong> to confirm:
                            </label>
                            <Input
                                id="confirm-delete"
                                value={deleteConfirmationInput}
                                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                                className="col-span-4"
                                placeholder="DELETE"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirmationOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={deleteConfirmationInput !== "DELETE" || isDeleting}
                        >
                            {isDeleting ? "Deleting..." : "Delete Account"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

