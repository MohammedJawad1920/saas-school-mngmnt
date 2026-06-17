"use client";

import TableComponent from "@/components/TableComponent";
import { useRouter } from "next/navigation";

import { UserPlus } from "lucide-react";

const columnsConfig = [
    { accessorKey: "name", header: "Classes" },
    {
        id: "saveContacts",
        header: "Save All Contacts",
        type: ["saveClassContactsAction"],
        width: 150,
        maxWidth: 150,
        minWidth: 150,
    }
];

const StudentsContactsTable = ({ data, apiKey }) => {
    const router = useRouter();

    const handleRowClick = (row) => {
        router.push(`/dashboard/students-contacts/${row.original._id}`);
    };

    // Inject the cell definition directly for the class-level action
    const enrichedColumnsConfig = columnsConfig.map(col => {
        if (col.type?.includes("saveClassContactsAction")) {
            return {
                ...col,
                cell: ({ row }) => {
                    const classId = row.original._id;
                    const className = row.original.name || "Class";
                    
                    const handleSave = (e) => {
                        e.stopPropagation();
                    };

                    const downloadUrl = `/api/vcard/class?classId=${classId}&className=${encodeURIComponent(className)}`;

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

export default StudentsContactsTable;
