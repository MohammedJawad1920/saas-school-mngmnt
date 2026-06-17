"use client";

import { useState, useEffect } from "react";
import TableComponent from "@/components/TableComponent";
import PopupForm from "@/components/PopupForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Check, X, BookOpen, Clock, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/Header";

export default function LibraryRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rentalPopupOpen, setRentalPopupOpen] = useState(false);
    const [rowSelection, setRowSelection] = useState({});
    const selectedIds = Object.keys(rowSelection);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/library/requests");
            const result = await res.json();
            if (result.success) {
                setRequests(result.data || []);
            }
        } catch (error) {
            console.error("Error fetching requests:", error);
            toast.error("Failed to fetch requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        
        // Auto-refresh every 10 seconds
        const interval = setInterval(fetchRequests, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleReject = async (requestId) => {
        if (!confirm("Are you sure you want to reject this request?")) return;
        try {
            const res = await fetch("/api/library/requests", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: requestId, status: "Rejected" }),
            });
            if (res.ok) {
                toast.success("Request rejected");
                fetchRequests();
            }
        } catch (error) {
            toast.error("Failed to reject request");
        }
    };

    const handleCreateRental = async (data) => {
        try {
            const response = await fetch("/api/rental", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                // Mark request as Approved
                if (selectedRequest) {
                    await fetch("/api/library/requests", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ _id: selectedRequest._id, status: "Approved" }),
                    });
                }
                toast.success("Rental created and request approved");
                fetchRequests();
                setRentalPopupOpen(false);
                return true;
            } else {
                const error = await response.json();
                toast.error(error.msg || "Failed to create rental");
                return false;
            }
        } catch (error) {
            toast.error("An error occurred");
            return false;
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected request(s)? This action cannot be undone.`)) {
            return;
        }

        try {
            const res = await fetch("/api/library/requests", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedIds })
            });
            const result = await res.json();
            if (result.success) {
                toast.success(result.msg || "Requests deleted successfully");
                setRowSelection({});
                fetchRequests();
            } else {
                toast.error(result.msg || "Failed to delete requests");
            }
        } catch (error) {
            console.error("Error deleting requests:", error);
            toast.error("An error occurred while deleting requests");
        }
    };

    const rentalFields = [
        {
            name: "bookId",
            label: "Book ID",
            inputType: "async-text",
            asyncProps: {
                endpoint: "/api/library/books",
                queryKey: "number",
                displayKey: "name",
                responseKey: "data"
            },
            required: true,
            enableScanner: true,
        },
        {
            name: "studentId",
            label: "Student ID",
            inputType: "async-text",
            asyncProps: {
                endpoint: "/api/users",
                queryKey: "_id",
                displayKey: "name",
                responseKey: "users"
            },
            required: true,
            enableScanner: true,
        },
        {
            name: "rentedDate",
            label: "Rented Date",
            inputType: "date",
            type: "date",
            required: true,
            defaultValue: new Date().toISOString().split("T")[0],
        }
    ];

    const columns = [
        {
            id: "select",
            header: ({ table }) => (
                <div className="flex flex-col items-center gap-0.5">
                    <Checkbox
                        checked={table.getIsAllPageRowsSelected()}
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                    {selectedIds.length > 0 && (
                        <span className="text-[10px] font-bold text-primary leading-none">
                            {selectedIds.length}
                        </span>
                    )}
                </div>
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
            enableHiding: false,
            meta: {
                width: "1px",
                padding: "0px 2px",
                textAlign: "center",
                className: "tight-column",
            },
        },
        {
            id: "serial",
            header: "Sl No",
            cell: ({ row }) => row.index + 1,
            meta: { width: "1%", whiteSpace: "nowrap", textAlign: "center", padding: "0px 2px" }
        },
        {
            accessorKey: "bookId.name",
            header: "Book Details",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-bold">{row.original.bookId?.name || "N/A"}</span>
                    <span className="text-xs text-muted-foreground">ID: {row.original.bookId?.number || "N/A"}</span>
                </div>
            )
        },
        {
            accessorKey: "studentId.name",
            header: "Student Details",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-bold">{row.original.studentId?.name || "N/A"}</span>
                    <span className="text-xs text-muted-foreground">ID: {row.original.studentId?._id || "N/A"}</span>
                </div>
            )
        },
        {
            accessorKey: "createdAt",
            header: "Requested On",
            cell: ({ row }) => (
                <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {format(new Date(row.original.createdAt), "PPP")}
                </div>
            )
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const status = row.original.status;
                return (
                    <Badge variant={status === "Pending" ? "outline" : status === "Approved" ? "success" : "destructive"}>
                        {status}
                    </Badge>
                );
            }
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                if (row.original.status !== "Pending") return null;
                return (
                    <div className="flex gap-2">
                        <Button 
                            size="sm" 
                            variant="success" 
                            className="h-8"
                            onClick={() => {
                                setSelectedRequest(row.original);
                                setRentalPopupOpen(true);
                            }}
                        >
                            <Check className="h-4 w-4 mr-1" /> Allow
                        </Button>
                        <Button 
                            size="sm" 
                            variant="destructive" 
                            className="h-8"
                            onClick={() => handleReject(row.original._id)}
                        >
                            <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                    </div>
                );
            }
        }
    ];

    return (
        <div className="space-y-4 pt-2">
            <Header 
                title="BOOKS REQUESTS" 
                subTitle="Manage student library book requests"
            />

            <TableComponent
                data={requests}
                columnsConfig={columns}
                getRowId={(row) => row._id}
                loading={loading}
                hideColumnManagement={true}
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                actionButtons={
                    selectedIds.length > 0 && (
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8"
                            onClick={handleBulkDelete}
                        >
                            <Trash2 className="h-4 w-4 lg:mr-2" />
                            <span className="hidden lg:inline">Delete </span>
                            ({selectedIds.length})
                        </Button>
                    )
                }
            />

            {rentalPopupOpen && selectedRequest && (
                <PopupForm
                    title="Process Rental"
                    description={`Creating rental for ${selectedRequest.studentId?.name} - ${selectedRequest.bookId?.name}`}
                    formFields={rentalFields}
                    data={{
                        bookId: selectedRequest.bookId?.number,
                        studentId: selectedRequest.studentId?._id,
                        rentedDate: new Date().toISOString().split("T")[0]
                    }}
                    open={rentalPopupOpen}
                    onOpenChange={setRentalPopupOpen}
                    onSubmit={handleCreateRental}
                    hideButton={true}
                />
            )}
        </div>
    );
}
