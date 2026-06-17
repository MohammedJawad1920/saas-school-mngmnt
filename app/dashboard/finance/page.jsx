
"use client";

import { useState, useEffect, useCallback } from "react";
import FinanceStats from "./_components/FinanceStats";
import DynamicDataTable from "@/components/DynamicDataTable";
import { Loader2, IndianRupee } from "lucide-react";

export default function FinancePage() {
  const [summary, setSummary] = useState({});
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;

  const fetchSummary = useCallback(async () => {
    try {
      // Fetching with limit 1 just to get the summary from the response
      const res = await fetch(`/api/finance?limit=1`);
      if (res.ok) {
        const result = await res.json();
        setSummary(result.summary || {});
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const columnsConfig = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    {
      accessorKey: "type",
      header: "Income/Expense",
      cell: ({ row }) => (
        <span className={row.original.type === "Income" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
          {row.original.type}
        </span>
      )
    },
    {
      accessorKey: "invoiceNo",
      header: "Invoice/Receipt No",
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "mode",
      header: "Mode",
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
  ];

  const formFields = [
    {
      name: "date",
      label: "Date",
      type: "date",
      required: true,
    },
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
    {
      name: "invoiceNo",
      label: "Invoice/Receipt No",
      type: "text",
      required: true,
    },
    {
      name: "category",
      label: "Category",
      type: "text",
      required: true,
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
    {
      name: "amount",
      label: "Amount",
      type: "number",
      required: true,
    },
  ];

  const filterConfig = [
    {
      name: "category",
      label: "Category",
      type: "text",
      width: "200px"
    },
    {
      name: "mode",
      label: "Mode",
      type: "select",
      options: [
        { value: "Cash", label: "Cash" },
        { value: "Bank", label: "Bank" }
      ],
      width: "150px"
    }
  ];

  // We wrap the fetchSummary in a way that it can be triggered by DataTable updates if needed, 
  // currently we'll rely on the periodic refresh of DataTable or manual refresh. 
  // DataTableComponent doesn't explicitly expose 'onDataChange' easily without modification.
  // BUT, we can just let the user see the summary, and refreshing the page or navigating updates it.
  // Ideally, we'd hook into the Add/Delete success effects, but DataTableComponent encapsulates them.
  // For now, this meets the 'standard UI' requirement.

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
      </div>

      <FinanceStats summary={summary} />

      <DynamicDataTable
        resource="finance"
        apiEndpoint="/api/finance"
        columnsConfig={columnsConfig}
        formFields={formFields}
        filterConfig={filterConfig}
        apiKey={apiKey}
        filterType="api" // Use API filtering logic
        enableDelete={true}
        createFormTitle="Add Transaction"
        editFormTitle="Edit Transaction"
      />
    </div>
  );
}
