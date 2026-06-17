"use client";

import { useState } from "react";
import Header from "@/components/Header";
import TableComponent from "@/components/TableComponent";
import PopupForm from "@/components/PopupForm";
import BestReaderCard from "./BestReaderCard";
import MostReadBookCard from "./MostReadBookCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Users, BookOpen, AlertCircle, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import Barcode from "react-barcode";
import { useReactToPrint } from "react-to-print";
import BarcodeSheet from "./BarcodeSheet";
import { Search, Scan, IdCard, Book as BookIcon, ScanBarcode } from "lucide-react";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(() => import("./BarcodeScanner"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    ),
});
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function LibraryDashboard({
    view,
    counts,
    categories,
    languages,
    initialBooks = [],
    initialRentals = [],
    initialPendingRentals = [],
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [rowSelection, setRowSelection] = useState({});
    const [editPopupOpen, setEditPopupOpen] = useState(false);
    const barcodeSheetRef = useRef(null);

    // --- Popup State ---
    const [categoriesPopupOpen, setCategoriesPopupOpen] = useState(false);
    const [languagesPopupOpen, setLanguagesPopupOpen] = useState(false);
    const [pendingRentalsPopupOpen, setPendingRentalsPopupOpen] = useState(false);
    const [totalBooksPopupOpen, setTotalBooksPopupOpen] = useState(false);
    const [availableBooksPopupOpen, setAvailableBooksPopupOpen] = useState(false);
    const [deleteErrorPopupOpen, setDeleteErrorPopupOpen] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null });

    // --- Lookup State ---
    const [studentSearchId, setStudentSearchId] = useState("");
    const [bookSearchId, setBookSearchId] = useState("");
    const [lookupStudent, setLookupStudent] = useState(null);
    const [lookupBook, setLookupBook] = useState(null);
    const [studentHistory, setStudentHistory] = useState([]);
    const [bookHistory, setBookHistory] = useState([]);
    const [studentPopupOpen, setStudentPopupOpen] = useState(false);
    const [bookPopupOpen, setBookPopupOpen] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [showStudentScanner, setShowStudentScanner] = useState(false);
    const [showBookScanner, setShowBookScanner] = useState(false);

    const selectedIds = Object.keys(rowSelection);
    const selectedBook = view === "books" && selectedIds.length === 1
        ? initialBooks.find(b => b._id === selectedIds[0])
        : null;

    const selectedRental = view === "rentals" && selectedIds.length === 1
        ? initialRentals.find(r => r._id === selectedIds[0])
        : null;

    // --- Dynamic Options ---
    const dynamicLanguages = useMemo(() => {
        const fromBooks = initialBooks.map(b => b.language).filter(Boolean);
        const fromApi = Array.isArray(languages) ? languages.map(l => l.language) : (languages || []);
        const all = new Set([...fromApi, ...fromBooks]);
        return Array.from(all).sort();
    }, [languages, initialBooks]);

    const dynamicCategories = useMemo(() => {
        const fromBooks = initialBooks.map(b => b.category).filter(Boolean);
        const fromApi = Array.isArray(categories) ? categories.map(c => c.category) : (categories || []);
        const all = new Set([...fromApi, ...fromBooks]);
        return Array.from(all).sort();
    }, [categories, initialBooks]);

    // --- Configurations ---

    const bookFields = [
        {
            name: "number",
            label: "Book ID",
            inputType: "text",
            type: "text",
            required: true,
            enableScanner: true,
        },
        {
            name: "name",
            label: "Book Name",
            inputType: "text",
            required: true,
        },
        {
            name: "author",
            label: "Author",
            inputType: "text",
            required: true,
        },
        {
            name: "language",
            label: "Language",
            inputType: "select",
            options: dynamicLanguages.map((l) => ({ value: l, label: l })),
            freeSolo: true,
            required: true,
        },
        {
            name: "category",
            label: "Category",
            inputType: "select",
            options: dynamicCategories.map((c) => ({ value: c, label: c })),
            freeSolo: true,
            required: true,
        },
        {
            name: "publication",
            label: "Publication",
            inputType: "text",
        },
        {
            name: "price",
            label: "Price",
            inputType: "number",
            type: "number",
        },
    ];

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
            autoFocus: true,
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
        },
        {
            name: "receivedDate",
            label: "Received Date",
            inputType: "date",
            type: "date",
        },
    ];

    const returnFormFields = [
        {
            name: "receivedDate",
            label: "Returned Date",
            type: "date",
            inputType: "date",
            required: true,
            defaultValue: new Date().toISOString().split("T")[0],
            className: "md:col-span-2",
        }
    ];

    const bookColumns = [
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
                padding: "0px 4px",
                textAlign: "center",
                className: "tight-column",
            },
        },
        {
            id: "serial",
            header: "Sl No",
            cell: ({ row }) => row.index + 1,
            meta: {
                width: "1px",
                whiteSpace: "nowrap",
                padding: "0px 8px",
                textAlign: "center",
                className: "tight-column",
            },
        },
        {
            accessorKey: "number",
            header: "Book ID",
            meta: {
                width: "100px",
                whiteSpace: "nowrap",
                padding: "0px 8px",
            }
        },
        {
            accessorKey: "name",
            header: "Book Name",
            meta: {
                width: "200px",
                whiteSpace: "normal"
            }
        },
        {
            accessorKey: "author",
            header: "Author",
            meta: {
                width: "150px",
                whiteSpace: "normal"
            }
        },
        {
            accessorKey: "language",
            header: "Language",
            filterFn: "equalsString",
            meta: {
                width: "1%",
                whiteSpace: "nowrap"
            }
        },
        {
            accessorKey: "category",
            header: "Category",
            filterFn: "equalsString",
            meta: {
                width: "1%",
                whiteSpace: "nowrap"
            }
        },
        {
            accessorKey: "publication",
            header: "Publication",
            meta: {
                width: "120px",
                whiteSpace: "normal"
            }
        },
        {
            accessorKey: "price",
            header: "Price",
            meta: {
                width: "1%",
                whiteSpace: "nowrap",
                padding: "4px 4px",
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            filterFn: "equalsString",
            cell: ({ row }) => {
                const status = row.getValue("status");
                const displayStatus = (status === "Pending" || status === "Rented") ? "Rented" : (status || "Unknown");
                const color = displayStatus === "Available" ? "text-green-600" : "text-red-600";
                return <span className={`font-medium ${color}`}>{displayStatus}</span>;
            },
            meta: { padding: "4px 4px" }
        },
        {
            id: "barcode",
            header: "Barcode",
            cell: ({ row }) => (
                <div className="flex flex-col items-center justify-center p-1 space-y-1">
                    {row.original.number && /^[\x20-\x7E]+$/.test(String(row.original.number)) ? (
                        <>
                            <ScanBarcode className="h-6 w-6 text-muted-foreground" />
                            <span className="font-mono text-[10px] uppercase tracking-widest">{row.original.number}</span>
                        </>
                    ) : (
                        <span className="text-xs text-muted-foreground py-2">Invalid</span>
                    )}
                </div>
            ),
            meta: {
                width: "130px",
                padding: "2px",
            }
        },
    ];

    const rentalColumns = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                />
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
                padding: "0px 8px",
                textAlign: "center",
                verticalAlign: "middle",
                className: "tight-column",
            },
        },
        {
            id: "serial",
            header: "Sl No",
            cell: ({ row }) => row.index + 1,
            meta: {
                width: "1px",
                whiteSpace: "nowrap",
                padding: "0px 8px",
                textAlign: "center",
                verticalAlign: "middle",
                className: "tight-column",
            },
        },
        {
            accessorKey: "bookId.number",
            header: "Book ID",
            meta: {
                width: "1%",
                minWidth: "auto",
                whiteSpace: "nowrap",
                padding: "0px 8px",
                verticalAlign: "middle",
            }
        },
        {
            accessorKey: "bookId.name",
            header: "Book Name",
            cell: ({ row }) => row.original.bookId?.name || "Unknown Book",
            meta: {
                whiteSpace: "nowrap"
            }
        },
        {
            accessorKey: "studentId", // Accessing object populated by backend
            header: "Student Name (ID)",
            cell: ({ row }) => {
                // If studentId is populated (which it should be now), show Name (ID)
                // Fallback to name if it's just an ID string or simple object field if not populated correctly for some reason?
                // Backend sends object { _id: "...", name: "..." }
                const student = row.original.studentId;
                if (student && typeof student === 'object') {
                    return `${student.name || "Unknown"} (${student._id || "?"})`;
                }
                // Fallback for logic if not populated or old data
                return row.original.studentName || row.original.studentId || "Unknown";
            },
            meta: {
                width: "1%",
                whiteSpace: "nowrap"
            }
        },
        {
            accessorKey: "rentedDate",
            header: "Rented On",
            cell: ({ row }) => row.original.rentedDate ? format(new Date(row.original.rentedDate), "PPP") : "-",
            meta: {
                width: "1%",
                whiteSpace: "nowrap"
            }
        },
        {
            accessorKey: "receivedDate",
            header: "Returned On",
            cell: ({ row }) => {
                const rental = row.original;
                return rental.receivedDate ? (
                    format(new Date(rental.receivedDate), "PPP")
                ) : (
                    <PopupForm
                        title="Return Book"
                        description="Select the returned date"
                        formFields={returnFormFields}
                        onSubmit={(data) => handleSaveReturnBook(rental._id, data)}
                        trigger={<span className="text-red-500 font-bold hover:underline cursor-pointer">Pending</span>}
                        className="sm:max-w-[250px]"
                        submitButtonClass="w-full"
                        buttonContainerClass="md:col-span-2"
                    />
                );
            },
            meta: {
                width: "1%",
                whiteSpace: "nowrap"
            }
        },
    ];


    const filterConfig = [
        {
            id: "language",
            label: "Language",
            inputType: "select",
            options: dynamicLanguages.map((l) => ({ value: l, label: l })),
        },
        {
            id: "category",
            label: "Category",
            inputType: "select",
            options: dynamicCategories.map((c) => ({ value: c, label: c })),
        },
        {
            id: "status",
            label: "Status",
            inputType: "select",
            options: [
                { value: "Available", label: "Available" },
                { value: "Rented", label: "Rented" },
            ],
        },
    ];


    // --- Print Logic ---
    const handlePrintBarcodes = useReactToPrint({
        contentRef: barcodeSheetRef,
        documentTitle: "Book Barcodes",
    });


    // --- Handlers ---

    const handleCreateBook = async (data) => {
        setLoading(true);
        try {
            const res = await fetch("/api/library/books", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                toast.success("Book created successfully");
                router.refresh();
                return true;
            } else {
                const errorData = await res.json();
                toast.error(errorData.msg || "Failed to create book");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while creating the book");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBook = async (id, data) => {
        setLoading(true);
        try {
            const res = await fetch("/api/library/books", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: id, ...data }),
            });
            if (res.ok) {
                toast.success("Book updated successfully");
                router.refresh();
                return true;
            } else {
                const errorData = await res.json();
                toast.error(errorData.msg || "Failed to update book");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while updating the book");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteBook = (id) => {
        setConfirmDialog({
            open: true,
            title: "Delete Book",
            message: "Are you sure you want to delete this book?",
            onConfirm: async () => {
                setLoading(true);
                try {
                    const res = await fetch(`/api/library/books?id=${id}`, { method: "DELETE" });
                    if (res.ok) router.refresh();
                } catch (error) { console.error(error); } 
                finally { setLoading(false); setConfirmDialog(prev => ({ ...prev, open: false })); }
            }
        });
    };

    const handleBulkDelete = () => {
        setConfirmDialog({
            open: true,
            title: "Delete Books",
            message: `Are you sure you want to delete ${selectedIds.length} books?`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    for (const id of selectedIds) {
                        await fetch(`/api/library/books?id=${id}`, { method: "DELETE" });
                    }
                    router.refresh();
                    setRowSelection({});
                } catch (error) { console.error(error); } 
                finally { setLoading(false); setConfirmDialog(prev => ({ ...prev, open: false })); }
            }
        });
    };

    const handleBulkDeleteRental = () => {
        const hasPending = selectedIds.some((id) => {
            const rental = initialRentals.find((r) => r._id === id);
            return rental && !rental.receivedDate;
        });

        if (hasPending) {
            setDeleteErrorPopupOpen(true);
            return;
        }

        setConfirmDialog({
            open: true,
            title: "Delete Rentals",
            message: `Are you sure you want to delete ${selectedIds.length} rentals?`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    for (const id of selectedIds) {
                        await fetch(`/api/rental?id=${id}`, { method: "DELETE" });
                    }
                    router.refresh();
                    setRowSelection({});
                } catch (error) { console.error(error); } 
                finally { setLoading(false); setConfirmDialog(prev => ({ ...prev, open: false })); }
            }
        });
    };

    const handleBulkReturn = () => {
        setConfirmDialog({
            open: true,
            title: "Return Items",
            message: `Are you sure you want to return ${selectedIds.length} items?`,
            onConfirm: async () => {
                setLoading(true);
                try {
                    for (const id of selectedIds) {
                        await fetch("/api/rental", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ _id: id, receivedDate: new Date() }),
                        });
                    }
                    router.refresh();
                    setRowSelection({});
                } catch (error) { console.error(error); } 
                finally { setLoading(false); setConfirmDialog(prev => ({ ...prev, open: false })); }
            }
        });
    };

    const handleCreateRental = async (data) => {
        setLoading(true);
        // Needed: Student Name. PopupForm returns ID if using resource.
        // If resource is used, we might need to fetch the name or rely on the backend to populate it?
        // The backend logic I wrote just saves the body.
        // I should probably enhance the backend to fetch student name if rental schema requires it AND it's not passed,
        // OR I can try to find the selected option label in the form values? PopupForm passes values.
        // For now, I will let the backend or simplifier handle it. 
        // Wait, Schema has `studentName`. If I don't send it, it will be null.
        // I will assume for now we might need to update API to fetch name, or just store ID.
        // Let's rely on ID for now and updated API later if needed.

        try {
            const res = await fetch("/api/rental", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                toast.success("Rental created successfully");
                router.refresh();
                return true;
            } else {
                const errorData = await res.json();
                toast.error(errorData.msg || "Failed to create rental");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while creating the rental");
        } finally {
            setLoading(false);
        }
    };

    const handleReturnBook = async (rental) => {
        // Set receivedDate to today
        setLoading(true);
        try {
            const res = await fetch("/api/rental", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: rental._id, receivedDate: new Date() }),
            });
            if (res.ok) {
                router.refresh();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    const handleSaveReturnBook = async (rentalId, data) => {
        setLoading(true);
        try {
            const res = await fetch("/api/rental", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: rentalId, receivedDate: data.receivedDate }),
            });
            if (res.ok) {
                toast.success("Book returned successfully");
                setStudentHistory(prev => prev.map(r => r._id === rentalId ? { ...r, receivedDate: data.receivedDate } : r));
                setBookHistory(prev => prev.map(r => r._id === rentalId ? { ...r, receivedDate: data.receivedDate } : r));
                router.refresh();
                return true;
            } else {
                toast.error("Failed to return book");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error returning book");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRental = async (data) => {
        setLoading(true);
        try {
            const res = await fetch("/api/rental", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id: selectedRental._id, ...data }),
            });
            if (res.ok) {
                router.refresh();
                setRowSelection({}); // Clear selection after update
                return true;
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRental = (id) => {
        const rental = initialRentals.find((r) => r._id === id);
        if (rental && !rental.receivedDate) {
            setDeleteErrorPopupOpen(true);
            return;
        }

        setConfirmDialog({
            open: true,
            title: "Delete Rental",
            message: "Are you sure you want to delete this rental?",
            onConfirm: async () => {
                setLoading(true);
                try {
                    const res = await fetch(`/api/rental?id=${id}`, { method: "DELETE" });
                    if (res.ok) router.refresh();
                } catch (error) { console.error(error); } 
                finally { setLoading(false); setConfirmDialog(prev => ({ ...prev, open: false })); }
            }
        });
    };

    // --- Lookup Handlers ---

    const handleStudentLookup = async (e, directId) => {
        if (e && e.key && e.key !== 'Enter') return;
        const id = directId || studentSearchId;
        if (!id) return;

        setLookupLoading(true);
        try {
            // First fetch student details
            const userRes = await fetch(`/api/users?_id=${id}`);
            const userData = await userRes.json();

            if (userData.users && userData.users.length > 0) {
                const student = userData.users[0];
                setLookupStudent(student);

                // Then fetch rental history
                const rentalRes = await fetch(`/api/rental?studentId=${student._id}`);
                const rentalData = await rentalRes.json();
                setStudentHistory(rentalData.data || []);

                setStudentPopupOpen(true);
                setStudentSearchId(""); // Clear input
            } else {
                toast.error("Student not found");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch student data");
        } finally {
            setLookupLoading(false);
        }
    };

    const handleBookLookup = async (e, directId) => {
        if (e && e.key && e.key !== 'Enter') return;
        const id = directId || bookSearchId;
        if (!id) return;

        setLookupLoading(true);
        try {
            // Find book by number
            const bookRes = await fetch("/api/library/books");
            const bookData = await bookRes.json();
            const book = bookData.data.find(b => String(b.number).toLowerCase() === id.toLowerCase());

            if (book) {
                setLookupBook(book);

                // Fetch rental history for this book
                const rentalRes = await fetch(`/api/rental?bookId=${book._id}`);
                const rentalData = await rentalRes.json();
                setBookHistory(rentalData.data || []);

                setBookPopupOpen(true);
                setBookSearchId(""); // Clear input
            } else {
                toast.error("Book not found");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch book data");
        } finally {
            setLookupLoading(false);
        }
    };

    // --- Views ---

    const renderConfirmDialog = () => (
        <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
            <DialogContent className="sm:max-w-md text-center">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-center gap-2 text-xl font-bold">
                        {confirmDialog.title}
                    </DialogTitle>
                </DialogHeader>
                <div className="py-6 text-center">
                    <p className="text-muted-foreground text-lg">{confirmDialog.message}</p>
                </div>
                <div className="flex justify-center gap-4 pb-2">
                    <Button variant="outline" onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))} disabled={loading} className="w-24">
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={() => {
                        if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                    }} disabled={loading} className="w-24">
                        {loading ? "..." : "Confirm"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );

    if (view === "dashboard") {
        return (
            <div className="space-y-6">
                <Header title="LIBRARY DASHBOARD" subTitle="Overview of library stats" />

                {/* Lookup Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-primary/20 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <IdCard className="h-4 w-4 text-primary" />
                                STUDENT LOOKUP
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Enter Student ID..."
                                        className="pl-10"
                                        value={studentSearchId}
                                        onChange={(e) => setStudentSearchId(e.target.value)}
                                        onKeyDown={handleStudentLookup}
                                        disabled={lookupLoading}
                                        autoFocus
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    variant={studentSearchId ? "default" : "outline"}
                                    onClick={() => studentSearchId ? handleStudentLookup() : setShowStudentScanner(true)}
                                    disabled={lookupLoading}
                                    className={!studentSearchId ? "bg-foreground text-background hover:bg-foreground/90 border-none" : "px-3 w-auto"}
                                >
                                    {lookupLoading ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ) : studentSearchId ? (
                                        <Search className="h-4 w-4 sm:mr-2" />
                                    ) : (
                                        <ScanBarcode className="h-4 w-4" />
                                    )}
                                    {studentSearchId && <span className="hidden sm:inline">Search</span>}
                                </Button>
                            </div>

                            <Dialog open={showStudentScanner} onOpenChange={setShowStudentScanner}>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Scan Student Card</DialogTitle>
                                    </DialogHeader>
                                    <BarcodeScanner
                                        onScan={(result) => {
                                            setStudentSearchId(result);
                                            setShowStudentScanner(false);
                                            handleStudentLookup(null, result);
                                        }}
                                        onClose={() => setShowStudentScanner(false)}
                                    />
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/20 shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <BookIcon className="h-4 w-4 text-primary" />
                                BOOK LOOKUP
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Enter Book ID..."
                                        className="pl-10"
                                        value={bookSearchId}
                                        onChange={(e) => setBookSearchId(e.target.value)}
                                        onKeyDown={handleBookLookup}
                                        disabled={lookupLoading}
                                    />
                                </div>
                                <Button
                                    size="icon"
                                    variant={bookSearchId ? "default" : "outline"}
                                    onClick={() => bookSearchId ? handleBookLookup() : setShowBookScanner(true)}
                                    disabled={lookupLoading}
                                    className={!bookSearchId ? "bg-foreground text-background hover:bg-foreground/90 border-none" : "px-3 w-auto"}
                                >
                                    {lookupLoading ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    ) : bookSearchId ? (
                                        <Search className="h-4 w-4 sm:mr-2" />
                                    ) : (
                                        <ScanBarcode className="h-4 w-4" />
                                    )}
                                    {bookSearchId && <span className="hidden sm:inline">Search</span>}
                                </Button>
                            </div>

                            <Dialog open={showBookScanner} onOpenChange={setShowBookScanner}>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Scan Book Barcode</DialogTitle>
                                    </DialogHeader>
                                    <BarcodeScanner
                                        onScan={(result) => {
                                            setBookSearchId(result);
                                            setShowBookScanner(false);
                                            handleBookLookup(null, result);
                                        }}
                                        onClose={() => setShowBookScanner(false)}
                                    />
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                </div >

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card
                        className="cursor-pointer hover:border-primary transition-all active:scale-[0.98]"
                        onClick={() => setTotalBooksPopupOpen(true)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
                            <Book className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{counts?.total || 0}</div>
                        </CardContent>
                    </Card>
                    <Card
                        className="cursor-pointer hover:border-primary transition-all active:scale-[0.98]"
                        onClick={() => setAvailableBooksPopupOpen(true)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Available Books</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{counts?.available || 0}</div>
                        </CardContent>
                    </Card>
                    <Card
                        className="cursor-pointer hover:border-primary transition-all active:scale-[0.98]"
                        onClick={() => setPendingRentalsPopupOpen(true)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Books</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{counts?.pendingRentals || 0}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card
                        className="cursor-pointer hover:border-primary transition-all active:scale-[0.98]"
                        onClick={() => setCategoriesPopupOpen(true)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Categories</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{categories?.length || 0}</div>
                        </CardContent>
                    </Card>
                    <Card
                        className="cursor-pointer hover:border-primary transition-all active:scale-[0.98]"
                        onClick={() => setLanguagesPopupOpen(true)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Languages</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{languages?.length || 0}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <BestReaderCard />
                    <MostReadBookCard />
                </div>

                {/* Student Popup */}
                <Dialog open={studentPopupOpen} onOpenChange={setStudentPopupOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Student Library Profile</DialogTitle>
                        </DialogHeader>
                        {lookupStudent && (
                            <div className="space-y-6 py-4">
                                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                                    <Avatar className="h-32 w-32 border-4 border-primary/10">
                                        <AvatarImage src={lookupStudent.profilePic?.url} />
                                        <AvatarFallback className="text-2xl">{lookupStudent.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-2 flex-1">
                                        <h2 className="text-2xl font-bold text-primary">{lookupStudent.name}</h2>
                                        <div className="flex flex-col gap-1">
                                            <div className="text-sm font-medium">Student ID: <span className="text-muted-foreground">{lookupStudent._id}</span></div>
                                            {lookupStudent.className && (
                                                <div className="text-sm font-medium">Class: <span className="text-muted-foreground">{lookupStudent.className}</span></div>
                                            )}
                                            <div className="text-sm font-medium">Batch: <span className="text-muted-foreground">{lookupStudent.batchName || "N/A"}</span></div>
                                            <div className="text-sm font-medium">Status: <span className={`font-bold ${lookupStudent.studentStatus === 'Active' ? 'text-green-600' : 'text-red-600'}`}>{lookupStudent.studentStatus || "N/A"}</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <BookOpen className="h-5 w-5 text-primary" />
                                        Rental History
                                    </h3>
                                    <div className="rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead>Book ID</TableHead>
                                                    <TableHead>Book Name</TableHead>
                                                    <TableHead>Rented Date</TableHead>
                                                    <TableHead>Returned Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {studentHistory.length > 0 ? (
                                                    studentHistory.map((rental) => (
                                                        <TableRow key={rental._id}>
                                                            <TableCell className="font-medium">{rental.bookId?.number}</TableCell>
                                                            <TableCell>{rental.bookId?.name}</TableCell>
                                                            <TableCell>{rental.rentedDate ? format(new Date(rental.rentedDate), "PP") : "-"}</TableCell>
                                                            <TableCell>
                                                                {rental.receivedDate ? (
                                                                    <span className="text-green-600 font-medium">
                                                                        {format(new Date(rental.receivedDate), "PP")}
                                                                    </span>
                                                                ) : (
                                                                    <PopupForm
                                                                        title="Return Book"
                                                                        description="Select the returned date"
                                                                        formFields={returnFormFields}
                                                                        onSubmit={(data) => handleSaveReturnBook(rental._id, data)}
                                                                        trigger={<span className="text-red-500 font-bold hover:underline cursor-pointer">Pending</span>}
                                                                        className="sm:max-w-[250px]"
                                                                        submitButtonClass="w-full"
                                                                        buttonContainerClass="md:col-span-2"
                                                                    />
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                            No rental history found
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Book Popup */}
                <Dialog open={bookPopupOpen} onOpenChange={setBookPopupOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Book Details & History</DialogTitle>
                        </DialogHeader>
                        {lookupBook && (
                            <div className="space-y-6 py-4">
                                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                                    <div className="bg-primary/5 p-6 rounded-xl border border-primary/10 flex items-center justify-center">
                                        <BookIcon className="h-24 w-24 text-primary" />
                                    </div>
                                    <div className="space-y-1 flex-1 text-center md:text-left">
                                        <h2 className="text-2xl font-bold text-primary">{lookupBook.name}</h2>
                                        <div className="flex flex-col gap-1">
                                            <div className="text-sm font-medium">Book ID: <span className="text-muted-foreground font-bold">{lookupBook.number}</span></div>
                                            <div className="text-sm font-medium">Author: <span className="text-muted-foreground uppercase">{lookupBook.author}</span></div>
                                            <div className="text-sm font-medium">Category: <span className="text-muted-foreground">{lookupBook.category}</span></div>
                                            <div className="text-sm font-medium">Language: <span className="text-muted-foreground">{lookupBook.language}</span></div>
                                            <div className="text-sm font-medium">Status:
                                                <span className={`ml-1 font-bold ${lookupBook.status === 'Available' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {lookupBook.status || 'Available'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary" />
                                        Rental History (Students)
                                    </h3>
                                    <div className="rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead>Student ID</TableHead>
                                                    <TableHead>Student Name</TableHead>
                                                    <TableHead>Rented Date</TableHead>
                                                    <TableHead>Returned Date</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {bookHistory.length > 0 ? (
                                                    bookHistory.map((rental) => (
                                                        <TableRow key={rental._id}>
                                                            <TableCell className="font-medium">{rental.studentId?._id || rental.studentId}</TableCell>
                                                            <TableCell>{rental.studentId?.name || rental.studentName || "Unknown"}</TableCell>
                                                            <TableCell>{rental.rentedDate ? format(new Date(rental.rentedDate), "PP") : "-"}</TableCell>
                                                            <TableCell>
                                                                {rental.receivedDate ? (
                                                                    <span className="text-green-600 font-medium">
                                                                        {format(new Date(rental.receivedDate), "PP")}
                                                                    </span>
                                                                ) : (
                                                                    <PopupForm
                                                                        title="Return Book"
                                                                        description="Select the returned date"
                                                                        formFields={returnFormFields}
                                                                        onSubmit={(data) => handleSaveReturnBook(rental._id, data)}
                                                                        trigger={<span className="text-red-500 font-bold hover:underline cursor-pointer">Pending</span>}
                                                                        className="sm:max-w-[250px]"
                                                                        submitButtonClass="w-full"
                                                                        buttonContainerClass="md:col-span-2"
                                                                    />
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                            No rental history found for this book
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Pending Rentals Popup */}
                <Dialog open={pendingRentalsPopupOpen} onOpenChange={setPendingRentalsPopupOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Pending Books (Currently Rented)</DialogTitle>
                        </DialogHeader>
                        <div className="rounded-md border mt-4">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sl No</TableHead>
                                        <TableHead>Book ID</TableHead>
                                        <TableHead>Book Name</TableHead>
                                        <TableHead>Student Name</TableHead>
                                        <TableHead>Rented Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialPendingRentals.length > 0 ? (
                                        initialPendingRentals.map((rental, index) => (
                                            <TableRow key={rental._id}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell className="font-medium">{rental.bookId?.number}</TableCell>
                                                <TableCell>{rental.bookId?.name}</TableCell>
                                                <TableCell>{rental.studentId?.name || rental.studentName}</TableCell>
                                                <TableCell>{rental.rentedDate ? format(new Date(rental.rentedDate), "PP") : "-"}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No pending books
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Categories Popup */}
                <Dialog open={categoriesPopupOpen} onOpenChange={setCategoriesPopupOpen}>
                    <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Books by Category</DialogTitle>
                        </DialogHeader>
                        <div className="rounded-md border mt-4">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sl No</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Books Count</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categories.length > 0 ? (
                                        categories.map((cat, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                                <TableCell className="font-bold">{cat.category}</TableCell>
                                                <TableCell className="text-right">
                                                    <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm font-bold">
                                                        {cat.count}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                No categories found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Languages Popup */}
                <Dialog open={languagesPopupOpen} onOpenChange={setLanguagesPopupOpen}>
                    <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Books by Language</DialogTitle>
                        </DialogHeader>
                        <div className="rounded-md border mt-4">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sl No</TableHead>
                                        <TableHead>Language</TableHead>
                                        <TableHead className="text-right">Books Count</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {languages.length > 0 ? (
                                        languages.map((lang, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                                <TableCell className="font-bold">{lang.language}</TableCell>
                                                <TableCell className="text-right">
                                                    <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm font-bold">
                                                        {lang.count}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                No languages found
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Total Books Popup */}
                <Dialog open={totalBooksPopupOpen} onOpenChange={setTotalBooksPopupOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Total Books Inventory</DialogTitle>
                        </DialogHeader>
                        <div className="rounded-md border mt-4">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sl No</TableHead>
                                        <TableHead>Book ID</TableHead>
                                        <TableHead>Book Name</TableHead>
                                        <TableHead>Author</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialBooks.length > 0 ? (
                                        initialBooks.map((book, index) => (
                                            <TableRow key={book._id}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell className="font-medium text-primary">{book.number}</TableCell>
                                                <TableCell>{book.name}</TableCell>
                                                <TableCell>{book.author}</TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${book.status === 'Available' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                        {book.status}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No books available
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Available Books Popup */}
                <Dialog open={availableBooksPopupOpen} onOpenChange={setAvailableBooksPopupOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Available Books</DialogTitle>
                        </DialogHeader>
                        <div className="rounded-md border mt-4">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[50px]">Sl No</TableHead>
                                        <TableHead>Book ID</TableHead>
                                        <TableHead>Book Name</TableHead>
                                        <TableHead>Author</TableHead>
                                        <TableHead>Category</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialBooks.filter(b => b.status === "Available").length > 0 ? (
                                        initialBooks.filter(b => b.status === "Available").map((book, index) => (
                                            <TableRow key={book._id}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell className="font-medium text-primary">{book.number}</TableCell>
                                                <TableCell>{book.name}</TableCell>
                                                <TableCell>{book.author}</TableCell>
                                                <TableCell>{book.category}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                No books available
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </DialogContent>
                </Dialog>
                {renderConfirmDialog()}
            </div>
        );
    }

    if (view === "books") {
        return (
            <div className="space-y-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <Header
                        title="BOOKS MANAGEMENT"
                        subTitle="Manage library books inventory"
                    />
                </div>
                <TableComponent
                    data={initialBooks}
                    columnsConfig={bookColumns}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    getRowId={(originalRow) => originalRow._id}
                    filterConfig={filterConfig}
                    enableGrid={true}
                    showTotalCount={true}
                    totalCountLabel="TOTAL NUMBER OF BOOKS"
                    renderGridItem={(row) => {
                        const book = row.original;
                        return (
                            <Card className="h-full hover:shadow-md transition-shadow overflow-hidden">
                                <CardContent className="p-4 flex gap-4 items-start">
                                    <div className="flex-shrink-0 flex flex-col items-center gap-2 w-28">
                                        <div className="bg-primary/10 p-3 rounded-md flex items-center justify-center h-24 w-24">
                                            <BookOpen className="h-10 w-10 text-primary" />
                                        </div>
                                        <div className="text-center w-full space-y-1">
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/50 py-0.5 rounded">ID: {book.number}</div>
                                            <div className="flex justify-center items-center w-full h-[38px] overflow-hidden bg-white rounded p-1 border border-border/50 shadow-sm">
                                                {book.number && /^[\x20-\x7E]+$/.test(String(book.number)) ? (
                                                    <Barcode
                                                        value={String(book.number)}
                                                        width={0.8}
                                                        height={22}
                                                        fontSize={0}
                                                        margin={0}
                                                        displayValue={false}
                                                        background="transparent"
                                                    />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Invalid</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1 min-w-0 py-1 flex flex-col h-full">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg leading-tight break-words mb-1" title={book.name}>{book.name}</h3>
                                            <div className="text-sm text-muted-foreground break-words" title={book.author}>Author: <span className="text-foreground font-medium">{book.author}</span></div>
                                            {book.publication && <div className="text-sm text-muted-foreground break-words" title={book.publication}>Publication: <span className="text-foreground">{book.publication}</span></div>}
                                            <div className="text-sm text-muted-foreground">Language: <span className="text-foreground">{book.language}</span></div>
                                            <div className="text-sm text-muted-foreground">Category: <span className="text-foreground">{book.category}</span></div>
                                        </div>

                                        <div className="pt-1 flex flex-col items-start gap-1 mt-auto">
                                            <div className="font-bold text-sm text-primary">₹{book.price?.toFixed(2) || "0.00"}</div>
                                            <div className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${book.status === 'Available' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                                                {(book.status === 'Pending' || book.status === 'Rented') ? 'Rented' : (book.status || "Unknown")}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    }}
                    actionButtons={
                        <div className="flex gap-2">
                            {selectedIds.length > 0 && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePrintBarcodes()}
                                        className="flex items-center gap-2 bg-foreground text-background hover:bg-foreground/90 hover:text-background border-none px-3"
                                    >
                                        <Scan className="h-4 w-4" />
                                        Print Barcodes
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleBulkDelete}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="ml-2">({selectedIds.length})</span>
                                    </Button>
                                </>
                            )}
                            {selectedBook && (
                                <PopupForm
                                    title="Edit Book"
                                    formFields={bookFields}
                                    data={selectedBook}
                                    onSubmit={(data) => handleUpdateBook(selectedBook._id, data)}
                                    loading={loading}
                                    open={editPopupOpen}
                                    onOpenChange={setEditPopupOpen}
                                />
                            )}
                            <PopupForm
                                title="Add New Book"
                                formFields={bookFields}
                                onSubmit={handleCreateBook}
                                loading={loading}
                            />
                        </div>
                    }
                />
                <BarcodeSheet ref={barcodeSheetRef} books={initialBooks.filter(b => selectedIds.includes(b._id))} />
                {renderConfirmDialog()}
            </div>
        );
    }

    if (view === "rentals") {
        return (
            <div className="space-y-2">
                <Header
                    title="RENTALS MANAGEMENT"
                    subTitle="Track book rentals"
                />
                <TableComponent
                    data={initialRentals}
                    columnsConfig={rentalColumns}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    getRowId={(originalRow) => originalRow._id}
                    actionButtons={
                        <div className="flex gap-2">
                            {selectedIds.length > 0 && (
                                <>
                                    {selectedRental && (
                                        <PopupForm
                                            title="Edit Rental"
                                            formFields={rentalFields}
                                            data={{
                                                ...selectedRental,
                                                bookId: selectedRental.bookId?._id || selectedRental.bookId,
                                                studentId: selectedRental.studentId?._id || selectedRental.studentId,
                                            }}
                                            onSubmit={handleUpdateRental}
                                            loading={loading}
                                        />
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkReturn}
                                    >
                                        Return ({selectedIds.length})
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleBulkDeleteRental}
                                    >
                                        Delete ({selectedIds.length})
                                    </Button>
                                </>
                            )}
                            <PopupForm
                                title="New Rental"
                                formFields={rentalFields}
                                onSubmit={handleCreateRental}
                                loading={loading}
                            />
                        </div>
                    }
                />
                
                <Dialog open={deleteErrorPopupOpen} onOpenChange={setDeleteErrorPopupOpen}>
                    <DialogContent className="sm:max-w-md text-center border-red-500/20">
                        <DialogHeader>
                            <DialogTitle className="text-red-500 flex items-center justify-center gap-2">
                                <AlertCircle className="h-5 w-5" />
                                Action Prevented
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-6 text-center">
                            <p className="text-muted-foreground text-lg">
                                Pending books can not be deleted.
                            </p>
                        </div>
                        <div className="flex justify-center pb-2">
                            <Button variant="outline" onClick={() => setDeleteErrorPopupOpen(false)} className="w-24">
                                Close
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
                {renderConfirmDialog()}
            </div>
        );
    }

    return <div>Invalid View</div>;
}
