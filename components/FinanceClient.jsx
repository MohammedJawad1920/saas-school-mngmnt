"use client";
import Header from "./Header";
import DataTableComponent from "./DataTableComponent";

const FinanceClient = ({ apiKey }) => {
  const columnsConfig = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    {
      accessorKey: "type",
      header: "Income/Expense",
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
      accessorKey: "amount",
      header: "Amount",
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
      name: "amount",
      label: "Amount",
      type: "number",
      required: true,
    },
  ];

  return (
    <div className="space-y-4">
      <Header title="FINANCE" subTitle="Manage Financial Transactions" />
      <DataTableComponent
        resource="finance"
        columnsConfig={columnsConfig}
        formFields={formFields}
        apiKey={apiKey}
      />
    </div>
  );
};

export default FinanceClient;
