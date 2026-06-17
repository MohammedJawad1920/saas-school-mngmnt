"use client";

import TableComponent from "@/components/TableComponent";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

const columnsConfig = [
    { accessorKey: "name", header: "Batches" },
    {
        id: "saveContacts",
        header: "Save All Contacts",
        type: ["saveBatchContactsAction"],
        width: 150,
        maxWidth: 150,
        minWidth: 150,
    }
];

const SparkContactsTable = ({ data, apiKey, activeTab }) => {
    const router = useRouter();

    const handleRowClick = (row) => {
        router.push(`/dashboard/spark/contacts/${row.original._id}?tab=${activeTab || 'gb'}`);
    };

    const enrichedColumnsConfig = columnsConfig.map(col => {
        if (col.type?.includes("saveBatchContactsAction")) {
            return {
                ...col,
                cell: ({ row }) => {
                    const batchId = row.original._id;
                    const batchName = row.original.name || "Batch";
                    
                    const handleSave = (e) => {
                        e.stopPropagation();
                    };

                    const downloadUrl = `/api/vcard/batch?batchId=${batchId}&batchName=${encodeURIComponent(batchName)}&type=${activeTab || 'gb'}`;

                    return (
                        <div className="flex justify-center items-center gap-2 print:hidden">
                            <span className="text-sm font-medium text-muted-foreground" title="Number of contacts">
                                {row.original.contactCount || 0}
                            </span>
                            <a
                                href={downloadUrl}
                                onClick={handleSave}
                                className="text-indigo-500 hover:text-indigo-700 p-2 flex justify-center items-center"
                                title="Save All Contacts"
                            >
                                <UserPlus className="w-5 h-5" />
                            </a>
                        </div>
                    );
                }
            };
        }
        return col;
    });

    return (
        <TableComponent
            data={data}
            columnsConfig={enrichedColumnsConfig}
            apiKey={apiKey}
            hidePrintBtn={true}
            hideSearch={true}
            hideColumnManagement={true}
            onRowClick={handleRowClick}
        />
    );
};

export default SparkContactsTable;
