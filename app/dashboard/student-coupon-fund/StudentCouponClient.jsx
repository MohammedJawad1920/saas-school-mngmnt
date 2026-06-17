"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useForm, useFieldArray } from "react-hook-form";
import { format } from "date-fns";
import {
    Loader,
    Plus,
    Search,
    FileSpreadsheet,
    Banknote,
    AlertCircle,
    TrendingUp,
    CreditCard,
    Download,
    Users,
    Trash2,
    Edit,
    Columns,
    Filter,
    X,
    Printer,
    ScanBarcode,
    ChevronDown
} from "lucide-react";
import dynamic from "next/dynamic";

const BarcodeScanner = dynamic(() => import("../../../components/BarcodeScanner"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center p-8">
            <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
    ),
});

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { fetchItems } from "@/lib/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
    DialogFooter,
} from "@/components/ui/dialog";
import { ComboBox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";
import { Checkbox } from "@/components/ui/checkbox";
import ConfirmationPopup from "@/components/ConfirmationPopup";

import useCrud from "@/hooks/use-crud";
import Cookies from "js-cookie";
import * as XLSX from "xlsx-js-style";



// Helper to generate dynamic academic years
const getAcademicYears = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 2016;
    const endYear = currentYear + 1; // Includes next year
    const years = [];
    for (let y = endYear; y >= startYear; y--) {
        years.push(String(y));
    }
    return years;
};

export default function StudentCouponClient({ apiKey }) {
    const [isSavingDetails, setIsSavingDetails] = useState(false);
    const [isSavingPayment, setIsSavingPayment] = useState(false);

    const [isPaymentPopupOpen, setIsPaymentPopupOpen] = useState(false);
    const [isSimplePayment, setIsSimplePayment] = useState(false);
    const [simplePaymentStudentName, setSimplePaymentStudentName] = useState("");

    const [activeView, setActiveView] = useState("none"); // "none", "coupons", "balances", "transactions"

    // Student Lookup State
    const [lookupSearchTerm, setLookupSearchTerm] = useState("");
    const [lookupStudent, setLookupStudent] = useState(null);
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [hasLookedUp, setHasLookedUp] = useState(false);
    const [lookupSelectedCouponIds, setLookupSelectedCouponIds] = useState([]);
    const [showLookupScanner, setShowLookupScanner] = useState(false);
    
    // Search Results State for Dropdown
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Filter State
    const [filterMode, setFilterMode] = useState("year"); // "year" or "date"
    const [filters, setFilters] = useState({
        search: "", // Combined Name/ID search from main bar or popover
        year: String(new Date().getFullYear()),
        status: "all",
        // Separate input fields in popover for specific queries IF we want them distinct?
        // User asked for "filters of student id, name...".
        // The main search bar covers Name/ID/CouponNo.
        // Let's add specific fields in popover to override/augment.
        // Actually, main search bar is convenient. Let's keep it.
        // But the POPUP must include them.
        studentNameData: "",
        studentIdData: ""
    });

    // We keep 'searchTerm' for the main quick search bar, but if popup filters are used, they might conflict?
    // Let's sync them. If user types in popup "Name", we set searchTerm?
    // Or we treat them as additional strict filters.
    // For simplicity: The main search bar updates `filters.search`. 
    // The popup fields `studentName` and `studentId` will be specific API params?
    // Our API supports generic `search` which checks both.
    // To support specific field filtering (e.g. ONLY name), we might need API update or just use the generic search.
    // User request: "POP UP INCLUDE FILTERS OF STUDENT ID , NAME".
    // I will map these to the generic search for now or add them to the filter object passed to API.
    // Since API generic `search` checks Name OR ID OR Coupon, it's broader.
    // Let's stick to generic search for Name/ID for now to avoid complexity, 
    // OR we can concat them into search string? No.
    // Let's use the `filters` state object for everything.

    const [selectedCouponIds, setSelectedCouponIds] = useState([]);
    const [visibleColumns, setVisibleColumns] = useState({
        slNo: true,
        id: true,
        studentName: true,
        year: true,
        couponNo: true,
        totalAmount: true,
        paid: true,
        balance: true,
        status: true,
    });

    // Data Fetching
    const { useFetchItems, useAddItem, useDeleteItem } = useCrud("student-coupons", apiKey);
    const { useFetchItems: useFetchUsers } = useCrud("users", apiKey);
    const { useFetchItems: useFetchBatches } = useCrud("batches", apiKey);
    const { useFetchItems: useFetchClasses } = useCrud("classes", apiKey);

    const addItem = useAddItem();
    const deleteItem = useDeleteItem();
    const updateItem = useCrud("student-coupons", apiKey).useUpdateItem();

    // Data Fetching for Student Lookup
    const lookupUsersQuery = useFetchUsers(0, 50, {
        global: lookupSearchTerm,
        roles: ["Student"]
    }, { enabled: false });

    useEffect(() => {
        const term = lookupSearchTerm.trim().toLowerCase();
        if (!term || !showSearchResults) {
            setSearchResults([]);
            return;
        }
        const delayDebounceFn = setTimeout(() => {
            setIsLookingUp(true);
            fetch(`/api/users?global=${term}&roles=Student`, { headers: { "api-key": apiKey }})
                .then(res => res.json())
                .then(data => {
                    if (data.users) setSearchResults(data.users);
                    else setSearchResults([]);
                })
                .catch(() => setSearchResults([]))
                .finally(() => setIsLookingUp(false));
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [lookupSearchTerm, showSearchResults, apiKey]);

    const lookupCouponsQuery = useFetchItems(0, 0, {
        studentId: lookupStudent?._id
    }, { enabled: !!lookupStudent?._id });

    const handleLookupSearch = async (directTerm) => {
        const term = typeof directTerm === 'string' ? directTerm : lookupSearchTerm;
        if (!term || !term.trim()) {
            toast.error("Please enter a student ID or Name to search.");
            return;
        }
        setHasLookedUp(true);
        setIsLookingUp(true);
        setLookupStudent(null);
        setLookupSelectedCouponIds([]);

        try {
            // Use direct fetch if directTerm is provided to avoid waiting for state update
            let users = [];
            if (typeof directTerm === 'string') {
                const res = await fetchItems("users", apiKey, 0, 50, { global: directTerm, roles: ["Student"] });
                users = res.users || [];
            } else {
                const result = await lookupUsersQuery.refetch();
                users = result.data?.users || [];
            }

            if (users.length > 0) {
                const searchLower = term.toLowerCase();
                const exactMatch = users.find(u =>
                    String(u._id).toLowerCase() === searchLower ||
                    String(u.name).toLowerCase() === searchLower
                );
                const foundStudent = exactMatch || users[0];
                setLookupStudent(foundStudent);
                if (typeof directTerm === 'string') setLookupSearchTerm(term);
            } else {
                toast.error("No student found with that ID or Name.");
            }
        } catch (error) {
            toast.error("Failed to search student.");
            console.error(error);
        } finally {
            setIsLookingUp(false);
        }
    };

    const handleLookupSelectAll = (checked, coupons) => {
        if (checked) {
            setLookupSelectedCouponIds(coupons.map(c => c._id));
        } else {
            setLookupSelectedCouponIds([]);
        }
    };

    const handleLookupSelectRow = (id, checked) => {
        if (checked) {
            setLookupSelectedCouponIds(prev => [...prev, id]);
        } else {
            setLookupSelectedCouponIds(prev => prev.filter(item => item !== id));
        }
    };

    const handleLookupBulkDelete = async () => {
        try {
            const promises = lookupSelectedCouponIds.map(id => deleteItem.mutateAsync({ data: { id } }));
            await Promise.all(promises);
            toast.success(`Successfully deleted ${lookupSelectedCouponIds.length} coupons`);
            setLookupSelectedCouponIds([]);
            lookupCouponsQuery.refetch();
            refetchCoupons(); // Also refetch main table
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete some coupons");
        }
    };

    // Fetch Batches (Shared)
    const { data: batchesData } = useFetchBatches(0, 1000, {}, { enabled: !!apiKey });
    const allBatches = batchesData?.batches || [];

    // Fetch Classes (Shared)
    const { data: classesData } = useFetchClasses(0, 1000, {}, { enabled: !!apiKey });
    const allClasses = classesData?.classes || [];

    // Filter out restricted batches (First, Second, Third, Fourth)
    const batches = useMemo(() => {
        const excludedTerms = ["first", "second", "third", "fourth"];
        return allBatches.filter(b =>
            !excludedTerms.some(term => b.name.toLowerCase().includes(term))
        );
    }, [allBatches]);

    const visibleBatchIds = useMemo(() => batches.map(b => b._id).join(","), [batches]);

    // =================================================================================================
    // SECTION 1: COUPON DETAILS (Bulk Entry)
    // =================================================================================================
    const [detailsBatchId, setDetailsBatchId] = useState("all");
    const [detailsClassId, setDetailsClassId] = useState([]);
    const [detailsStudentId, setDetailsStudentId] = useState([]);

    // Setup for Bulk Student List
    const [bulkStudents, setBulkStudents] = useState([]);
    const [isLoadingBulkStudents, setIsLoadingBulkStudents] = useState(false);
    const [isPrintingSheet, setIsPrintingSheet] = useState(false);
    // State to hold individual coupon numbers: { [studentId]: "A001" }
    const [couponNumbers, setCouponNumbers] = useState({});

    const handlePrintSheet = () => {
        if (detailsBatchId === "all" && detailsClassId.length === 0) {
            toast.warning("Please select a Batch or Class first to print the sheet.");
            return;
        }
        if (bulkStudents.length === 0) {
            toast.warning("Please load students using 'Coupon Entry' before printing.");
            return;
        }
        setIsPrintingSheet(true);
        // Wait for render
        setTimeout(() => {
            window.print();
            // Reset after print dialog closes (or user cancels)
            // Browsers pause JS execution during print dialog usually, so this runs after.
            // But to be safe, we can leave it or use a small timeout.
            setTimeout(() => setIsPrintingSheet(false), 500);
        }, 100);
    };

    // Fetch Students Query (On demand logic mostly, but we use the hook to sync)
    // We will trigger this manually via refetch or enabling it when "Get Students" clicked
    const detailsStudentFilters = {
        roles: ["Student"],
        batchId: detailsBatchId !== "all" ? detailsBatchId : visibleBatchIds,
        ...(detailsClassId.length > 0 && {
            classId: detailsClassId.join(","),
            status: "Active" // Only active students if Class is selected
        })
    };

    // We use enabled: !!apiKey to automatically trigger fetch for dropdown
    const { data: detailsUsersData, refetch: refetchDetailsUsers, isFetching: isFetchingUsers } = useFetchUsers(0, 1000, detailsStudentFilters, { enabled: !!apiKey });
    const detailsStudents = [...(detailsUsersData?.users || [])].sort((a, b) => String(a._id).localeCompare(String(b._id), undefined, { numeric: true, sensitivity: 'base' }));

    // Fetch Coupons for Pre-filling
    const { data: allCouponsForYearData, refetch: refetchAllCoupons } = useFetchItems(0, 0, {
        academicYear: String(new Date().getFullYear()) // Default, will update dynamically
    }, { enabled: false });

    // Fetch Un-filtered Coupons for Reports (Balances & Transactions)
    const { data: allYearsCouponsData, isFetching: isFetchingAllYearsCoupons } = useFetchItems(0, 0, {
        academicYear: filterMode === "year" && filters.year !== "all" ? filters.year : undefined,
        batchId: detailsBatchId !== "all" ? detailsBatchId : undefined,
        classId: detailsClassId.length > 0 ? detailsClassId.join(",") : undefined,
        studentId: detailsStudentId.length > 0 ? detailsStudentId.join(",") : undefined,
        startDate: filterMode === "date" ? filters.startDate : undefined,
        endDate: filterMode === "date" ? filters.endDate : undefined,
    }, { enabled: activeView === "balances" || activeView === "transactions", keepPreviousData: true });


    const {
        register: registerDetails,
        handleSubmit: handleSubmitDetails,
        setValue: setValueDetails,
        reset: resetDetails,
        watch: watchDetails,
        getValues: getValuesDetails
    } = useForm({
        defaultValues: {
            couponAmount: ""
        }
    });

    const currentYear = filters.year;

    // Fetch classes for dropdown
    const { data: detailsClassesData } = useFetchClasses(0, 1000, {
        ...(detailsBatchId !== "all" && { batchId: detailsBatchId })
    }, { enabled: !!apiKey });
    const detailsClasses = detailsClassesData?.classes || [];


    const handleGetStudents = async () => {
        if (detailsBatchId === "all" && detailsClassId.length === 0 && detailsStudentId.length === 0) {
            toast.warning("Please select a Batch, Class, or Students to load students.");
            return;
        }
        setIsLoadingBulkStudents(true);
        try {
            // 1. Fetch Students
            const usersResult = await refetchDetailsUsers();
            let students = usersResult.data?.users || [];

            if (detailsStudentId.length > 0) {
                 students = students.filter(s => detailsStudentId.includes(s._id));
            }

            if (students.length === 0) {
                toast.warning("No students found for satisfied criteria");
                setBulkStudents([]);
                return;
            }

            // 2. Fetch Existing Coupons (to prefill numbers)
            // We pass academicYear to the query
            // Note: useFetchItems hook arguments might be stale in closure if not carefully used, 
            // but refetch() uses current props if updated? No, usually TanStack uses render props.
            // Hack: we'll call API directly or accept we refetch base on current state if react-query handles it.
            // Better: Trigger the refetch of the coupons query which is watching `selectedYearFilter` usually, 
            // but here we want `currentYear` from form.

            // Let's rely on global coupons list if it covers everything or fetch specifically. 
            // Since we split logic, we should probably fetch specifically.
            // For now, let's assume `coupons` (global list) might have it if updated. 
            // BUT global list is filtered by search/pagination.
            // SO we need to fetch all coupons for this Batch+Year. 
            // Limitations: Backend might not support batch filtering for coupons yet fully.
            // Workaround: Fetch all for Year (might be heavy) or ignore pre-fill if too hard? 
            // User requested "add their coupon number", implying pre-fill if exists is nice.

            // Let's try to fetch coupons matching these students.
            // Since we have the student list, we can just check against `couponsData` if we remove pagination limits there? 
            // No, bad for perf.

            // Let's assume we start blank or fetch fresh.
            setBulkStudents([...students].sort((a, b) => String(a._id).localeCompare(String(b._id), undefined, { numeric: true, sensitivity: 'base' })));

            // Initialize coupon numbers map
            // Ideally we should pre-fill from DB. 
            // Let's use `refetchAllCoupons` with the year filter.
            // We need to update existing query options for `allCouponsForYearData` first?
            // Actually, let's just use `coupons` from the main list IF the user removed filters? 
            // No, reliable way is:

            // Simple: Just show inputs blank initially. If user needs to SEE existing numbers, they check the table below.
            // BUT user wants to ADD/Edit them.
            // Let's try to pre-fill from the main `coupons` data if available.

            const existingMap = {};
            // We will scan the `coupons` already loaded in the bottom table (assuming "All Years" or matching year)
            // This is risky if bottom table is paginated.
            // Best Effort: Just init empty. If user re-saves, it updates.

            // UPDATE: I'll try to match from `coupons` array if loaded.
            coupons.forEach(c => {
                if (c.academicYear === currentYear && c.studentId?._id) {
                    existingMap[c.studentId._id] = c.couponNumber || "";
                }
            });

            setCouponNumbers(existingMap);

        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch students");
        } finally {
            setIsLoadingBulkStudents(false);
        }
    };

    const handleCouponNumberChange = (studentId, value) => {
        setCouponNumbers(prev => ({ ...prev, [studentId]: value }));
    };

    const onSaveDetails = async (data) => {
        if (bulkStudents.length === 0) {
            toast.error("No students loaded. Click 'Coupon Entry' first.");
            return;
        }

        if (filterMode === "date") {
            toast.error("Please switch to 'Academic Year' filter and select a valid year to save details.");
            return;
        }

        if (filters.year === "all") {
            toast.error("Please select a specific Academic Year to save details.");
            return;
        }

        setIsSavingDetails(true);
        try {
            const promises = bulkStudents.map((student) => {
                const cNumber = couponNumbers[student._id] || "";
                
                const finalAmount = data.couponAmount || 0;

                const payload = {
                    studentId: student._id,
                    academicYear: filters.year,
                    couponAmount: finalAmount,
                    couponNumber: cNumber.trim() || ""
                };
                return addItem.mutateAsync(payload);
            });

            await Promise.all(promises);
            toast.success(`Updated ${bulkStudents.length} students successfully`);

            setBulkStudents([]);
            setCouponNumbers({});
            // Keep Batch/Class selected for workflow continuity? User might want to do next batch.
            // But maybe clear students list to avoid confusion.

            refetchCoupons();
        } catch (error) {
            console.error(error);
            const detailedError = error?.details?.errors?.map(e => `${e.field}: ${e.message}`).join(", ");
            toast.error(detailedError || error?.message || "Failed to save details");
        } finally {
            setIsSavingDetails(false);
        }
    };


    // =================================================================================================
    // SECTION 2: PAYMENT DETAILS (Transactions)
    // =================================================================================================
    const [paymentBatchId, setPaymentBatchId] = useState("all");
    const [paymentClassId, setPaymentClassId] = useState([]);
    const [paymentStudentId, setPaymentStudentId] = useState([]);

    // Fetch Classes for Payment
    const { data: paymentClassesData } = useFetchClasses(0, 1000, {
        ...(paymentBatchId !== "all" && { batchId: paymentBatchId })
    }, { enabled: !!apiKey });
    const paymentClasses = paymentClassesData?.classes || [];

    // Fetch Students for Payment
    const paymentStudentFilters = {
        roles: ["Student"],
        batchId: paymentBatchId !== "all" ? paymentBatchId : visibleBatchIds,
        ...(paymentClassId.length > 0 && {
            classId: paymentClassId.join(","),
            status: "Active"
        })
    };
    const { data: paymentUsersData } = useFetchUsers(0, 1000, paymentStudentFilters, { enabled: !!apiKey });
    const paymentStudents = [...(paymentUsersData?.users || [])].sort((a, b) => String(a._id).localeCompare(String(b._id), undefined, { numeric: true, sensitivity: 'base' }));

    const {
        register: registerPayment,
        handleSubmit: handleSubmitPayment,
        setValue: setValuePayment,
        reset: resetPayment,
        watch: watchPayment
    } = useForm({
        defaultValues: {
            academicYear: String(new Date().getFullYear()),
            date: new Date().toISOString().split('T')[0],
            amount: ""
        }
    });

    const onSavePayment = async (data) => {
        if (paymentStudentId.length === 0) {
            toast.error("Please select at least one student for Payment");
            return;
        }

        if (filters.year === "all") {
            toast.error("Please select a specific Academic Year from the Total Collected Card to save payment.");
            return;
        }

        setIsSavingPayment(true);
        try {
            const promises = paymentStudentId.map((studentId) => {
                const payload = {
                    studentId: studentId,
                    academicYear: filters.year,
                    payment: {
                        amount: Number(data.amount) || 0,
                        date: new Date(data.date),
                    }
                };
                return addItem.mutateAsync(payload);
            });

            await Promise.all(promises);
            toast.success(`Payment saved for ${paymentStudentId.length} students`);

            resetPayment({
                date: new Date().toISOString().split('T')[0],
                amount: ""
            });
            setPaymentStudentId([]);
            setIsPaymentPopupOpen(false);
            refetchCoupons();
        } catch (error) {
            console.error(error);
            const detailedError = error?.details?.errors?.map(e => `${e.field}: ${e.message}`).join(", ");
            toast.error(detailedError || error?.message || "Failed to save payment");
        } finally {
            setIsSavingPayment(false);
        }
    };


    // =================================================================================================
    // COUPON LIST & EXPORTS
    // =================================================================================================
    // Data Fetching for Coupons
    // Construct query filters
    const queryFilters = useMemo(() => {
        if (hasLookedUp && lookupStudent) {
            return {
                academicYear: filterMode === "year" && filters.year !== "all" ? filters.year : undefined,
                startDate: filterMode === "date" ? filters.startDate : undefined,
                endDate: filterMode === "date" ? filters.endDate : undefined,
                studentId: lookupStudent._id
            };
        }
        return {
            academicYear: filterMode === "year" && filters.year !== "all" ? filters.year : undefined,
            startDate: filterMode === "date" ? filters.startDate : undefined,
            endDate: filterMode === "date" ? filters.endDate : undefined,
            batchId: detailsBatchId !== "all" ? detailsBatchId : undefined,
            status: filters.status !== "all" ? filters.status : undefined,
            classId: detailsClassId.length > 0 ? detailsClassId.join(",") : undefined,
            search: filters.search
        };
    }, [filters.year, filters.status, filters.search, filters.startDate, filters.endDate, detailsBatchId, detailsClassId, hasLookedUp, lookupStudent, filterMode]);

    const shouldFetchCoupons = !!apiKey;
    const { data: couponsData, isLoading, refetch: refetchCoupons } = useFetchItems(0, 0, queryFilters, { enabled: shouldFetchCoupons });

    const coupons = couponsData?.coupons || [];
    const stats = couponsData?.stats || { totalCouponAmount: 0, totalCollected: 0, totalPending: 0 };


    const handleBulkDelete = async () => {
        try {
            // We need to delete multiple items.
            // Our useDeleteItem hook takes one item at a time currently based on current implementation understanding.
            // But usually APIs might support bulk. Here we will iterate as per plan.

            const promises = selectedCouponIds.map(id => deleteItem.mutateAsync({ data: { id } }));
            await Promise.all(promises);

            toast.success(`Successfully deleted ${selectedCouponIds.length} coupons`);
            setSelectedCouponIds([]); // Clear selection
            refetchCoupons();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete some coupons");
        }
    };

    // =================================================================================================
    // EDIT MODAL
    // =================================================================================================
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [viewHistoryCoupon, setViewHistoryCoupon] = useState(null);

    const {
        register: registerEdit,
        handleSubmit: handleSubmitEdit,
        setValue: setValueEdit,
        reset: resetEdit,
        watch: watchEdit,
        control: controlEdit
    } = useForm();

    const { fields: paymentFields, append: appendPayment, remove: removePayment } = useFieldArray({
        control: controlEdit,
        name: "payments"
    });

    const handleEdit = (targetCoupon) => {
        let coupon;
        if (targetCoupon && targetCoupon._id) {
            coupon = targetCoupon;
            setSelectedCouponIds([coupon._id]);
        } else {
            if (selectedCouponIds.length !== 1) return;
            coupon = coupons.find(c => c._id === selectedCouponIds[0]) || lookupCouponsQuery.data?.coupons?.find(c => c._id === selectedCouponIds[0]);
        }
        if (!coupon) return;

        setEditingCoupon(coupon);

        // Populate payments
        const initialPayments = (coupon.payments && coupon.payments.length > 0)
            ? coupon.payments.map(p => ({
                amount: p.amount,
                date: new Date(p.date).toISOString().split('T')[0]
            }))
            : [{ amount: 0, date: new Date().toISOString().split('T')[0] }];

        resetEdit({
            couponNumber: coupon.couponNumber || "",
            couponAmount: coupon.couponAmount || 0,
            payments: initialPayments
        });

        setIsEditOpen(true);
    };

    const handlePayBalance = (coupon) => {
        // Pre-fill Payment Form
        setPaymentBatchId("all"); // Reset batch to all to ensure student is found (or ideally specific batch if known)
        setPaymentClassId([]); // Reset class
        setPaymentStudentId([coupon.studentId?._id]);
        setSimplePaymentStudentName(coupon.studentId?.name || "");

        // Use Global Filter for academic year as Payment Form doesn't have it anymore
        setFilters(prev => ({ ...prev, year: coupon.academicYear }));

        // Open Popup
        setIsSimplePayment(true);
        setIsPaymentPopupOpen(true);
    };

    const onSaveEdit = async (data) => {
        try {
            const finalAmount = Number(data.couponAmount) || 0;

            await updateItem.mutateAsync({
                data: {
                    id: editingCoupon._id,
                    couponNumber: data.couponNumber,
                    couponAmount: finalAmount,
                    payments: data.payments || [] // explicitly pass empty array if user deleted all entries
                }
            });

            toast.success("Coupon updated successfully");
            setIsEditOpen(false);
            setEditingCoupon(null);
            refetchCoupons();
        } catch (error) {
            console.error(error);
            toast.error(error?.message || "Failed to update coupon");
        }
    };


    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedCouponIds(coupons.map(c => c._id));
        } else {
            setSelectedCouponIds([]);
        }
    };

    const handleSelectRow = (id, checked) => {
        if (checked) {
            setSelectedCouponIds(prev => [...prev, id]);
        } else {
            setSelectedCouponIds(prev => prev.filter(item => item !== id));
        }
    };

    const exportToExcel = () => {
        const dataToExport = coupons.map(c => ({
            "Student Name": c.studentId?.name,
            "Student ID": c.studentId?._id,
            "Class/Year": c.academicYear,
            "Coupon No": c.couponNumber,
            "Amount": c.couponAmount,
            "Paid": c.totalPaid,
            "Balance": c.balance,
            "Status": c.status
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Coupons");
        XLSX.writeFile(wb, "Student_Coupons.xlsx");
    };

    const exportToPDF = async () => {
        try {
            const jsPDF = (await import("jspdf")).default;
            const autoTable = (await import("jspdf-autotable")).default;

            const doc = new jsPDF();
            doc.text("Student Coupon Fund Report", 14, 15);

            const tableData = coupons.map((c, index) => [
                index + 1,
                c.studentId?._id || "",
                c.studentId?.name || "",
                c.academicYear || "",
                c.couponNumber || "",
                c.couponAmount || 0,
                c.totalPaid || 0,
                c.balance || 0,
                c.status || "Pending"
            ]);

            autoTable(doc, {
                head: [["Sl No", "ID", "Name", "Year", "Coupon", "Amount", "Paid", "Balance", "Status"]],
                body: tableData,
                startY: 20,
            });
            doc.save("Student_Coupons.pdf");
        } catch (error) {
            console.error("PDF Export Error:", error);
            toast.error("Failed to export PDF");
        }
    };

    // --- Data for Option 2: Balances By Year ---
    const allYearsCoupons = allYearsCouponsData?.coupons || [];

    const balancesReportParams = useMemo(() => {
        if (!allYearsCoupons.length) return { studentRows: [], yearColumns: [] };
        
        const yearsSet = new Set();
        const studentMap = new Map();

        allYearsCoupons.forEach(coupon => {
            const y = coupon.academicYear;
            if (y) yearsSet.add(y);

            const sId = coupon.studentId?._id;
            if (!sId) return;

            if (!studentMap.has(sId)) {
                studentMap.set(sId, {
                    id: sId,
                    name: coupon.studentId?.name || "Unknown",
                    balances: {},
                    totalBalance: 0
                });
            }

            const sData = studentMap.get(sId);
            const bal = Number(coupon.balance) || 0;
            sData.balances[y] = (sData.balances[y] || 0) + bal;
            sData.totalBalance += bal;
        });

        const yearColumns = Array.from(yearsSet).sort((a, b) => Number(b) - Number(a)); // Descending years
        const studentRows = Array.from(studentMap.values()).sort((a, b) => a.name.localeCompare(b.name));

        return { studentRows, yearColumns };
    }, [allYearsCoupons]);

    // --- Data for Option 3: Transaction History ---
    const transactionsReport = useMemo(() => {
        if (!allYearsCoupons.length) return [];
        const txs = [];
        allYearsCoupons.forEach(c => {
            if (c.payments && Array.isArray(c.payments)) {
                c.payments.forEach(p => {
                    const pDate = new Date(p.date);
                    if (filterMode === "date") {
                        if (filters.startDate) {
                            const start = new Date(filters.startDate);
                            start.setHours(0, 0, 0, 0);
                            if (pDate < start) return;
                        }
                        if (filters.endDate) {
                            const end = new Date(filters.endDate);
                            end.setHours(23, 59, 59, 999);
                            if (pDate > end) return;
                        }
                    }
                    txs.push({
                        date: pDate,
                        studentName: c.studentId?.name || "Unknown",
                        amount: Number(p.amount) || 0,
                        academicYear: c.academicYear
                    });
                });
            }
        });
        txs.sort((a, b) => b.date - a.date);
        return txs;
    }, [allYearsCoupons, filterMode, filters.startDate, filters.endDate]);

    // Filter Classes
    const filterClassesData = useFetchClasses(0, 1000, {
        ...(filters.batchId !== "all" && { batchId: filters.batchId })
    }, { enabled: !!apiKey });
    const filterClasses = filterClassesData.data?.classes || [];

    const clearFilters = () => {
        setFilters({
            search: "",
            batchId: "all",
            classId: [],
            year: String(new Date().getFullYear()),
            status: "all",
            startDate: "",
            endDate: "",
            studentNameData: "",
            studentIdData: ""
        });
    };

    return (
        <div className={`px-2 md:px-6 pb-6 pt-2 space-y-6 ${isPrintingSheet ? "print-sheet-active" : ""}`}>
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold uppercase tracking-wide">
                    STUDENT COUPON FUND <span className="hidden md:inline">MANAGEMENT</span>
                </h1>
                <p className="text-muted-foreground">Manage student coupons</p>
            </div>

            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-table, #printable-table * {
                        visibility: visible;
                    }
                    #printable-table {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    /* Custom Print Sheet Styles */
                    #printable-sheet {
                        display: none;
                    }
                    .print-sheet-active #printable-sheet {
                        display: block;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white;
                        z-index: 9999;
                    }

                    .print-sheet-active #printable-sheet,
                    .print-sheet-active #printable-sheet * {
                        visibility: visible;
                    }
                    .print-sheet-active #printable-table {
                        display: none;
                    }
                    @page {
                        size: landscape;
                        margin: 5mm; /* Minimal margin for printer */
                    }
                    .print-sheet-active #printable-sheet {
                        padding: 0; /* Remove internal padding */
                    }
                    #printable-table thead tr th {
                        background-color: #e5e7eb !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        color: black !important;
                    }
                    /* Reduce padding for print sheet table cells */
                    .print-sheet-active td, .print-sheet-active th {
                        padding: 4px 8px !important;
                        height: 30px !important;
                        font-size: 12px !important;
                    }
                }
            `}</style>

            {/* Top Cards: Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Student Lookup Card */}
                <Card className="w-full shadow-sm h-full flex flex-col justify-center">
                    <CardHeader className="bg-muted/10 pb-6 pt-6 flex-1 rounded-t-xl
                    ">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Search className="w-5 h-5 text-primary" />
                            Student Lookup
                        </CardTitle>
                        <CardDescription>
                            Search for a student to view coupon history
                        </CardDescription>
                        <div className="flex gap-2 mt-4 w-full max-w-2xl">
                            <div className="relative flex-1">
                                <Input
                                    placeholder="Search by Student ID or Name..."
                                    value={lookupSearchTerm}
                                    onChange={(e) => {
                                        setLookupSearchTerm(e.target.value);
                                        setShowSearchResults(true);
                                    }}
                                    onFocus={(e) => {
                                        e.target.select();
                                        setShowSearchResults(true);
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => setShowSearchResults(false), 200);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            if (searchResults.length === 1) {
                                                const s = searchResults[0];
                                                setLookupStudent(s);
                                                setHasLookedUp(true);
                                                setLookupSearchTerm(s.name);
                                                setShowSearchResults(false);
                                            } else {
                                                handleLookupSearch();
                                            }
                                        }
                                    }}
                                    className="w-full pr-10 bg-white"
                                />
                                {(hasLookedUp || lookupSearchTerm) && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-transparent"
                                        onClick={() => {
                                            setLookupSearchTerm("");
                                            setHasLookedUp(false);
                                            setLookupStudent(null);
                                            setLookupSelectedCouponIds([]);
                                            setShowSearchResults(false);
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                                
                                {/* Search Results Dropdown */}
                                {showSearchResults && searchResults.length > 0 && (
                                    <div className="absolute z-[999] left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-lg max-h-[400px] overflow-y-auto">
                                        {searchResults.map((student) => {
                                            const batch = allBatches.find(b => b._id === (student.studentSpecificField?.batchId || student.batchId));
                                            const cls = allClasses.find(c => c._id === (student.studentSpecificField?.classId || student.classId));
                                            const batchName = batch?.name || "No Batch";
                                            const className = cls?.name || "No Class";
                                            
                                            return (
                                                <div
                                                    key={student._id}
                                                    className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-0"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault(); // Prevent blur
                                                        setLookupStudent(student);
                                                        setHasLookedUp(true);
                                                        setLookupSearchTerm(student.name);
                                                        setShowSearchResults(false);
                                                    }}
                                                >
                                                    <Avatar className="h-10 w-10 border">
                                                        <AvatarImage src={student.profilePic?.url} />
                                                        <AvatarFallback>{student.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0 text-sm">
                                                        <div className="font-medium truncate">{student.name}</div>
                                                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2">
                                                            <span>ID: {student._id}</span>
                                                        </div>
                                                        <div className="text-[11px] text-primary/70 font-semibold truncate">
                                                            {className} • {batchName}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <Button
                                variant={lookupSearchTerm ? "default" : "outline"}
                                onClick={() => lookupSearchTerm ? handleLookupSearch() : setShowLookupScanner(true)}
                                disabled={isLookingUp}
                                className={!lookupSearchTerm ? "bg-foreground text-background hover:bg-foreground/90 border-none px-6" : "px-6"}
                            >
                                {isLookingUp ? (
                                    <Loader className="h-4 w-4 animate-spin sm:mr-2" />
                                ) : (
                                    lookupSearchTerm ? <Search className="h-4 w-4 sm:mr-2" /> : <ScanBarcode className="h-4 w-4 sm:mr-2" />
                                )}
                                <span className="hidden sm:inline">{lookupSearchTerm ? "Search" : "Scan"}</span>
                            </Button>

                            <Dialog open={showLookupScanner} onOpenChange={setShowLookupScanner}>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Scan Student Card</DialogTitle>
                                    </DialogHeader>
                                    <BarcodeScanner
                                        onScan={(result) => {
                                            setLookupSearchTerm(result);
                                            setShowLookupScanner(false);
                                            // Directly trigger search with the result
                                            handleLookupSearch(result);
                                        }}
                                        onClose={() => setShowLookupScanner(false)}
                                    />
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                </Card>

                {/* Total Amount Summary Card */}
                <Card className="w-full border-green-200 shadow-sm bg-green-50/30 h-full">
                    <CardContent className="h-full pt-6 pb-6 flex justify-center items-center relative">
                        <div className="flex flex-col items-center space-y-2">
                            <div className="text-sm md:text-base font-semibold uppercase tracking-widest text-muted-foreground">
                                Total Collected Amount
                            </div>
                            <div className="text-4xl md:text-5xl font-bold text-green-600 tabular-nums">
                                ₹{stats.totalCollected.toLocaleString()}
                            </div>
                        </div>

                        {/* Global Clear (if Date Range Filtering Active) */}
                        {(filters.startDate || filters.endDate) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFilters(prev => ({ ...prev, startDate: "", endDate: "" }))}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                title="Clear Date Filters"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        )}
                    </CardContent>
                </Card>

            </div>

            {hasLookedUp && (
                <Card className="w-full border-primary/20 shadow-sm relative overflow-hidden bg-card">
                    <CardContent className="pt-6">
                        {isLookingUp ? (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                <Loader className="h-8 w-8 animate-spin mb-4" />
                                <p className="text-sm">Looking up student...</p>
                            </div>
                        ) : lookupStudent ? (
                            <div className="space-y-6">
                                {/* Profile Section */}
                                <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 bg-muted/20 p-4 rounded-lg border">
                                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border shadow-sm flex-shrink-0">
                                        <AvatarImage src={lookupStudent.profilePic?.url} />
                                        <AvatarFallback className="text-lg font-medium text-primary bg-primary/10">
                                            {lookupStudent.name?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 space-y-1 text-center sm:text-left">
                                        <h3 className="text-xl font-bold tracking-tight">{lookupStudent.name}</h3>
                                        <div className="text-sm text-muted-foreground flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1">
                                            <div><span className="font-medium mr-1">ID:</span> {lookupStudent._id}</div>
                                            {lookupStudent.className && <div><span className="font-medium mr-1">Class:</span> {lookupStudent.className}</div>}
                                            {lookupStudent.batchName && <div><span className="font-medium mr-1">Batch:</span> {lookupStudent.batchName}</div>}
                                        </div>
                                    </div>
                                    <div className="hidden sm:block text-right self-start md:self-center">
                                        <Badge variant={lookupStudent.status === "Active" ? "outline" : "secondary"} className={lookupStudent.status === "Active" ? "bg-green-50 text-green-700 border-green-200" : ""}>
                                            {lookupStudent.status || "Unknown"}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Lookup Table Actions */}
                                {lookupSelectedCouponIds.length > 0 && (
                                    <div className="flex items-center justify-between p-2 bg-muted/30 border rounded-md">
                                        <span className="text-sm text-muted-foreground ml-2">
                                            {lookupSelectedCouponIds.length} selected
                                        </span>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const coupon = lookupCouponsQuery.data?.coupons?.find(c => c._id === lookupSelectedCouponIds[0]);
                                                    if (coupon) {
                                                        handleEdit(coupon);
                                                    }
                                                }}
                                                disabled={lookupSelectedCouponIds.length !== 1}
                                            >
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit
                                            </Button>
                                            <ConfirmationPopup
                                                action="delete"
                                                title={`Delete ${lookupSelectedCouponIds.length} Coupons?`}
                                                description="This action cannot be undone."
                                                onClick={handleLookupBulkDelete}
                                            >
                                                <Button variant="destructive" size="sm">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </Button>
                                            </ConfirmationPopup>
                                        </div>
                                    </div>
                                )}

                                {/* Lookup Table */}
                                <div className="border rounded-md overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="w-[50px]">
                                                    <Checkbox
                                                        checked={lookupCouponsQuery.data?.coupons?.length > 0 && lookupSelectedCouponIds.length === lookupCouponsQuery.data?.coupons?.length}
                                                        onCheckedChange={(checked) => handleLookupSelectAll(checked, lookupCouponsQuery.data?.coupons || [])}
                                                    />
                                                </TableHead>
                                                <TableHead>Sl No</TableHead>
                                                <TableHead>Year</TableHead>
                                                <TableHead>Coupon No</TableHead>
                                                <TableHead>Total Amount</TableHead>
                                                <TableHead>Paid</TableHead>
                                                <TableHead>Balance</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {lookupCouponsQuery.isLoading || lookupCouponsQuery.isFetching ? (
                                                <TableRow><TableCell colSpan={8} className="text-center h-24"><Loader className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                            ) : !lookupCouponsQuery.data?.coupons || lookupCouponsQuery.data?.coupons.length === 0 ? (
                                                <TableRow><TableCell colSpan={8} className="text-center h-24 text-muted-foreground">No coupon records found for this student.</TableCell></TableRow>
                                            ) : (
                                                lookupCouponsQuery.data.coupons.map((coupon, index) => (
                                                    <TableRow key={coupon._id}>
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={lookupSelectedCouponIds.includes(coupon._id)}
                                                                onCheckedChange={(checked) => handleLookupSelectRow(coupon._id, checked)}
                                                            />
                                                        </TableCell>
                                                        <TableCell>{index + 1}</TableCell>
                                                        <TableCell className="font-medium">{coupon.academicYear}</TableCell>
                                                        <TableCell>{coupon.couponNumber || "-"}</TableCell>
                                                        <TableCell>₹{coupon.couponAmount}</TableCell>
                                                        <TableCell
                                                            className="text-green-600 font-semibold cursor-pointer hover:underline"
                                                            onClick={() => setViewHistoryCoupon(coupon)}
                                                        >
                                                            ₹{coupon.totalPaid}
                                                        </TableCell>
                                                        <TableCell
                                                            className="text-red-600 font-semibold cursor-pointer hover:underline"
                                                            onClick={() => handlePayBalance(coupon)}
                                                        >
                                                            ₹{coupon.balance}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={coupon.status === "Paid" ? "success" : coupon.status === "Partial" ? "warning" : "destructive"}>
                                                                {coupon.status}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                            {lookupCouponsQuery.data?.coupons?.length > 0 && (
                                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                    <TableCell></TableCell>
                                                    <TableCell></TableCell>
                                                    <TableCell></TableCell>
                                                    <TableCell className="text-right font-bold uppercase">Total:</TableCell>
                                                    <TableCell className="font-bold">₹{lookupCouponsQuery.data.stats?.totalCouponAmount || 0}</TableCell>
                                                    <TableCell className="font-bold text-green-700">₹{lookupCouponsQuery.data.stats?.totalCollected || 0}</TableCell>
                                                    <TableCell className="font-bold text-red-700">₹{lookupCouponsQuery.data.stats?.totalPending || 0}</TableCell>
                                                    <TableCell></TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-muted-foreground">
                                No student found. Please try a different ID or name.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )
            }


            {/* Edit Coupon Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Coupon</DialogTitle>
                    </DialogHeader>
                    {editingCoupon && (
                        <form onSubmit={handleSubmitEdit(onSaveEdit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Student Name</Label>
                                <Input value={editingCoupon.studentId?.name || ""} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>Coupon Number</Label>
                                <Input {...registerEdit("couponNumber")} placeholder="Coupon Number" />
                            </div>
                            <div className="space-y-2">
                                <Label>Total Amount</Label>
                                <Input type="number" {...registerEdit("couponAmount")} placeholder="Total Amount" />
                            </div>
                            <div className="space-y-4">
                                <Label>Payments History</Label>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto border p-2 rounded">
                                    {paymentFields.map((field, index) => (
                                        <div key={field.id} className="flex gap-2 items-center">
                                            <div className="grid gap-1 flex-1">
                                                <Label className="text-xs text-muted-foreground">Amount</Label>
                                                <Input
                                                    type="number"
                                                    {...registerEdit(`payments.${index}.amount`)}
                                                    placeholder="Amount"
                                                />
                                            </div>
                                            <div className="grid gap-1 flex-1">
                                                <Label className="text-xs text-muted-foreground">Date</Label>
                                                <Input
                                                    type="date"
                                                    {...registerEdit(`payments.${index}.date`)}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="mt-4 text-red-500 hover:text-red-700"
                                                onClick={() => removePayment(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => appendPayment({ amount: 0, date: new Date().toISOString().split('T')[0] })}
                                    >
                                        <Plus className="h-3 w-3 mr-1" /> Add Payment
                                    </Button>

                                    {/* Calculated Total Display */}
                                    <div className="text-sm">
                                        Total Paid: <span className="font-bold text-green-600">
                                            ₹{(watchEdit("payments") || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={updateItem.isPending}>
                                    {updateItem.isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Payment History Dialog */}
            <Dialog open={!!viewHistoryCoupon} onOpenChange={(open) => !open && setViewHistoryCoupon(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Payment History</DialogTitle>
                    </DialogHeader>
                    {viewHistoryCoupon && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-muted/20 p-2 rounded">
                                <span className="font-semibold">{viewHistoryCoupon.studentId?.name}</span>
                                <Badge variant="outline">{viewHistoryCoupon.couponNumber}</Badge>
                            </div>
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {viewHistoryCoupon.payments && viewHistoryCoupon.payments.length > 0 ? (
                                            viewHistoryCoupon.payments.map((payment, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell>{format(new Date(payment.date), "dd MMM yyyy")}</TableCell>
                                                    <TableCell className="text-right font-medium">₹{payment.amount}</TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={2} className="text-center text-muted-foreground h-20">No payment history found</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex justify-end border-t pt-2">
                                <div className="text-sm">Total Paid: <span className="font-bold text-green-600">₹{viewHistoryCoupon.totalPaid}</span></div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* FORMS CONTAINER */}
            {
                !hasLookedUp && (
                    <>
                        <div className="space-y-6">

                            {/* CARD 1: COUPON DETAILS - BULK ENTRY */}
                            <Card className="border shadow-sm bg-card">
                                <CardHeader className="px-3 pt-3 pb-2 md:px-6 md:pt-6 md:pb-2">
                                    <CardTitle>Coupon Details (Bulk Entry)</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 md:px-6 md:pb-6 md:pt-0">
                                    <form onSubmit={handleSubmitDetails(onSaveDetails)}>
                                        <div className="space-y-3 md:space-y-6">
                                            {/* Unified Filter & Selection Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                                                {/* 1. Filter Mode */}
                                                <div className="space-y-2 order-1 md:order-1">
                                                    <Label>Filter By</Label>
                                                    <Select value={filterMode} onValueChange={setFilterMode}>
                                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="year">Academic Year</SelectItem>
                                                            <SelectItem value="date">Date Range</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* 2 & 3. Academic Year or Date Range */}
                                                {filterMode === "year" ? (
                                                    <div className="space-y-2 order-2 md:order-2">
                                                        <Label>Academic Year</Label>
                                                        <Select
                                                            value={filters.year}
                                                            onValueChange={(val) => setFilters(prev => ({ ...prev, year: val }))}
                                                        >
                                                            <SelectTrigger className="bg-white"><SelectValue placeholder="Year" /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="all">All</SelectItem>
                                                                {getAcademicYears().map((year) => (
                                                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="space-y-2 order-2 md:order-2">
                                                            <Label>From Date</Label>
                                                            <Input
                                                                type="date"
                                                                className="h-10 px-2 bg-white w-full"
                                                                value={filters.startDate}
                                                                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                                                            />
                                                        </div>
                                                        <div className="space-y-2 order-2 md:order-2">
                                                            <Label>To Date</Label>
                                                            <Input
                                                                type="date"
                                                                className="h-10 px-2 bg-white w-full"
                                                                value={filters.endDate}
                                                                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                                            />
                                                        </div>
                                                    </>
                                                )}

                                                {/* 4. Select Batch */}
                                                <div className="space-y-2 order-3 md:order-4">
                                                    <Label>Select Batch</Label>
                                                    <Select
                                                        value={detailsBatchId}
                                                        onValueChange={(val) => {
                                                            setDetailsBatchId(val);
                                                            setDetailsClassId([]);
                                                            setDetailsStudentId([]);
                                                            setBulkStudents([]); 
                                                        }}
                                                    >
                                                        <SelectTrigger className="bg-white"><SelectValue placeholder="Select Batch" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">Select Batch</SelectItem>
                                                            {batches.map((batch) => (
                                                                <SelectItem key={batch._id} value={batch._id}>{batch.name} ({batch.endYear})</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* 5. Select Class */}
                                                <div className="space-y-2 order-4 md:order-5">
                                                    <Label>Select Class</Label>
                                                    <MultiSelect
                                                        options={detailsClasses.map(c => ({ label: c.name, value: c._id }))}
                                                        onValueChange={(val) => {
                                                            setDetailsClassId(val);
                                                            setDetailsStudentId([]);
                                                            setBulkStudents([]);
                                                        }}
                                                        value={detailsClassId}
                                                        placeholder="Select Classes"
                                                        variant="default"
                                                    />
                                                </div>

                                                {/* 6. Select Students */}
                                                <div className="space-y-2 col-span-2 md:col-span-2 order-5 md:order-6">
                                                    <Label>Select Students</Label>
                                                    <MultiSelect
                                                        options={detailsStudents.map(s => ({ label: `${s._id} - ${s.name}`, value: s._id }))}
                                                        onValueChange={setDetailsStudentId}
                                                        value={detailsStudentId}
                                                        placeholder="All Students"
                                                        variant="default"
                                                    />
                                                </div>

                                                {/* 7. Action Dropdown */}
                                                <div className="space-y-2 col-span-2 md:col-span-1 order-6 md:order-7">
                                                    <Label>Action</Label>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                className="w-full h-10 flex justify-between items-center text-sm font-normal px-3 py-2 bg-white border border-input hover:bg-accent hover:text-accent-foreground"
                                                                disabled={isLoadingBulkStudents || isFetchingAllYearsCoupons}
                                                            >
                                                                <div className="flex items-center">
                                                                    {(isLoadingBulkStudents || isFetchingAllYearsCoupons) ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                                    {activeView === "none" ? "Select Action" : activeView === "balances" ? "View Balances" : activeView === "transactions" ? "View Transactions" : "Coupon Entry"}
                                                                </div>
                                                                <ChevronDown className="h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width] min-w-[200px]">
                                                            <DropdownMenuItem onClick={() => { setActiveView("coupons"); handleGetStudents(); }} className="cursor-pointer">
                                                                1. Coupon Entry
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setActiveView("balances")} className="cursor-pointer">
                                                                2. View Balances
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setActiveView("transactions")} className="cursor-pointer">
                                                                3. View Transactions
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>

                                            {/* Bulk Student List */}
                                            {bulkStudents.length > 0 && (
                                                <div className="space-y-4 border rounded-md p-4 bg-muted/10">
                                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                                                        {/* Header Title Row */}
                                                        <div className="flex items-center justify-between w-full md:w-auto">
                                                            <h3 className="font-semibold text-lg">
                                                                {bulkStudents.length} <span className="hidden md:inline">Students Found</span><span className="md:hidden">Students</span>
                                                            </h3>
                                                            {/* Mobile Print Button: Same row as Title */}
                                                            <Button
                                                                type="button"
                                                                className="h-9 md:hidden bg-black hover:bg-gray-800 text-white px-4"
                                                                onClick={handlePrintSheet}
                                                            >
                                                                <Printer className="mr-2 h-4 w-4" />
                                                                <span>Print</span>
                                                            </Button>
                                                        </div>
                                                        
                                                        <div className="flex items-center justify-end gap-3">
                                                            {/* Amount & Desktop Print - Stacking Amount on top on mobile right */}
                                                            <div className="flex flex-col items-end gap-2 md:flex-row md:items-center">
                                                                <div className="flex items-center gap-2 order-1 md:order-2">
                                                                    <Label className="whitespace-nowrap text-sm md:text-base">Global Amount:</Label>
                                                                    <Input
                                                                        type="number"
                                                                        {...registerDetails("couponAmount", { required: true })}
                                                                        className="w-24 md:w-32 h-9 md:h-10"
                                                                        placeholder="Amount"
                                                                    />
                                                                </div>
                                                                
                                                                {/* Desktop Print Button: Before Global Amount */}
                                                                <Button
                                                                    type="button"
                                                                    className="hidden md:flex h-10 bg-black hover:bg-gray-800 text-white px-8 md:order-1"
                                                                    onClick={handlePrintSheet}
                                                                >
                                                                    <Printer className="mr-2 h-4 w-4" />
                                                                    <span>Print Sheet</span>
                                                                </Button>
                                                            </div>

                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-9 w-9 md:h-10 md:w-10 text-muted-foreground hover:text-foreground shrink-0"
                                                                onClick={() => {
                                                                    setBulkStudents([]);
                                                                    setCouponNumbers({});
                                                                }}
                                                                title="Close Sheet"
                                                            >
                                                                <X className="h-5 w-5" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="max-h-[400px] overflow-y-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead className="w-[30px] md:w-[50px] px-2">No.</TableHead>
                                                                    <TableHead className="px-2">ID</TableHead>
                                                                    <TableHead className="px-2">Student Name</TableHead>
                                                                    <TableHead className="w-[100px] md:w-[200px] px-2">Coupon No</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {bulkStudents.map((student, index) => (
                                                                    <TableRow key={student._id}>
                                                                        <TableCell className="px-2 text-xs md:text-sm">{index + 1}</TableCell>
                                                                        <TableCell className="px-2 text-xs md:text-sm">{student._id}</TableCell>
                                                                        <TableCell className="font-medium px-2 text-xs md:text-sm break-words min-w-[80px] md:min-w-0" title={student.name}>{student.name}</TableCell>
                                                                        <TableCell className="px-2">
                                                                            <Input
                                                                                id={`coupon-input-${index}`}
                                                                                className="h-8 w-24 md:w-48 text-xs md:text-sm"
                                                                                placeholder="No"
                                                                                value={couponNumbers[student._id] || ""}
                                                                                onChange={(e) => handleCouponNumberChange(student._id, e.target.value)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === "Enter") {
                                                                                        e.preventDefault();
                                                                                        if (index < bulkStudents.length - 1) {
                                                                                            const nextInput = document.getElementById(`coupon-input-${index + 1}`);
                                                                                            if (nextInput) nextInput.focus();
                                                                                        } else {
                                                                                            handleSubmitDetails(onSaveDetails)();
                                                                                        }
                                                                                    } else if (e.key === "ArrowDown") {
                                                                                        e.preventDefault();
                                                                                        if (index < bulkStudents.length - 1) {
                                                                                            const nextInput = document.getElementById(`coupon-input-${index + 1}`);
                                                                                            if (nextInput) nextInput.focus();
                                                                                        }
                                                                                    } else if (e.key === "ArrowUp") {
                                                                                        e.preventDefault();
                                                                                        if (index > 0) {
                                                                                            const prevInput = document.getElementById(`coupon-input-${index - 1}`);
                                                                                            if (prevInput) prevInput.focus();
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>

                                                    <div className="flex justify-end pt-2 gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            disabled={isSavingDetails}
                                                            onClick={() => {
                                                                setBulkStudents([]);
                                                                setCouponNumbers({});
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button type="submit" disabled={isSavingDetails}>
                                                            {isSavingDetails ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                                            Save All Details
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>


                        </div>

                        {/* Filters & Table Controls */}
                        <div className="flex flex-wrap md:flex-nowrap gap-2 items-center">

                            {/* GROUP 1: Column & Filter Buttons */}
                            <div className="flex gap-2 order-1 md:order-1">
                                {/* Advanced Filter Popover (Columns) */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon">
                                            <Columns className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" sideOffset={8} className="w-44">
                                        <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <div className="p-2">
                                            <div className="flex items-center space-x-2 mb-2 p-1 hover:bg-accent rounded-sm cursor-pointer" onClick={() => {
                                                const allChecked = Object.values(visibleColumns).every(Boolean);
                                                const newVal = !allChecked;
                                                setVisibleColumns(prev => {
                                                    const next = { ...prev };
                                                    Object.keys(next).forEach(k => next[k] = newVal);
                                                    return next;
                                                });
                                            }}>
                                                <Checkbox
                                                    checked={Object.values(visibleColumns).every(Boolean)}
                                                    id="select-all"
                                                />
                                                <label htmlFor="select-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer pointer-events-none">
                                                    Select All
                                                </label>
                                            </div>
                                            <DropdownMenuSeparator />
                                            <div className="grid gap-2 mt-2">
                                                <div className="flex items-center space-x-2 p-1 hover:bg-accent rounded-sm cursor-pointer" onClick={() => setVisibleColumns(prev => ({ ...prev, slNo: !prev.slNo }))}>
                                                    <Checkbox checked={visibleColumns.slNo} id="col-sl" />
                                                    <label htmlFor="col-sl" className="text-sm cursor-pointer pointer-events-none">Sl No</label>
                                                </div>
                                                <div className="flex items-center space-x-2 p-1 hover:bg-accent rounded-sm cursor-pointer" onClick={() => setVisibleColumns(prev => ({ ...prev, id: !prev.id }))}>
                                                    <Checkbox checked={visibleColumns.id} id="col-id" />
                                                    <label htmlFor="col-id" className="text-sm cursor-pointer pointer-events-none">ID</label>
                                                </div>
                                                <div className="flex items-center space-x-2 p-1 hover:bg-accent rounded-sm cursor-pointer" onClick={() => setVisibleColumns(prev => ({ ...prev, studentName: !prev.studentName }))}>
                                                    <Checkbox checked={visibleColumns.studentName} id="col-name" />
                                                    <label htmlFor="col-name" className="text-sm cursor-pointer pointer-events-none">Student Name</label>
                                                </div>
                                                <div className="flex items-center space-x-2 p-1 hover:bg-accent rounded-sm cursor-pointer" onClick={() => setVisibleColumns(prev => ({ ...prev, year: !prev.year }))}>
                                                    <Checkbox checked={visibleColumns.year} id="col-year" />
                                                    <label htmlFor="col-year" className="text-sm cursor-pointer pointer-events-none">Year</label>
                                                </div>
                                                <div className="flex items-center space-x-2 p-1 hover:bg-accent rounded-sm cursor-pointer" onClick={() => setVisibleColumns(prev => ({ ...prev, couponNo: !prev.couponNo }))}>
                                                    <Checkbox checked={visibleColumns.couponNo} id="col-coupon" />
                                                    <label htmlFor="col-coupon" className="text-sm cursor-pointer pointer-events-none">Coupon No</label>
                                                </div>
                                                <div className="flex items-center space-x-2 p-1 hover:bg-accent rounded-sm cursor-pointer" onClick={() => setVisibleColumns(prev => ({ ...prev, totalAmount: !prev.totalAmount }))}>
                                                    <Checkbox checked={visibleColumns.totalAmount} id="col-amount" />
                                                    <label htmlFor="col-amount" className="text-sm cursor-pointer pointer-events-none">Total Amount</label>
                                                </div>
                                                <div className="flex items-center space-x-2 p-1 hover:bg-accent rounded-sm cursor-pointer" onClick={() => setVisibleColumns(prev => ({ ...prev, paid: !prev.paid }))}>
                                                    <Checkbox checked={visibleColumns.paid} id="col-paid" />
                                                    <label htmlFor="col-paid" className="text-sm cursor-pointer pointer-events-none">Paid</label>
                                                </div>
                                                <div className="flex items-center space-x-2 p-1 hover:bg-accent rounded-sm cursor-pointer" onClick={() => setVisibleColumns(prev => ({ ...prev, balance: !prev.balance }))}>
                                                    <Checkbox checked={visibleColumns.balance} id="col-balance" />
                                                    <label htmlFor="col-balance" className="text-sm cursor-pointer pointer-events-none">Balance</label>
                                                </div>
                                                <div className="flex items-center space-x-2 p-1 hover:bg-accent rounded-sm cursor-pointer" onClick={() => setVisibleColumns(prev => ({ ...prev, status: !prev.status }))}>
                                                    <Checkbox checked={visibleColumns.status} id="col-status" />
                                                    <label htmlFor="col-status" className="text-sm cursor-pointer pointer-events-none">Status</label>
                                                </div>
                                            </div>
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Advanced Filter Modal */}
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="icon" className="relative">
                                            <Filter className="h-4 w-4" />
                                            {/* Dot indicator if active filters */}
                                            {(filters.year !== "all" || filters.status !== "all") &&
                                                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary" />
                                            }
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <DialogHeader>
                                            <DialogTitle>Advanced Filters</DialogTitle>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="space-y-1">
                                                <Label>Status</Label>
                                                <Select value={filters.status} onValueChange={(val) => setFilters(prev => ({ ...prev, status: val }))}>
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue placeholder="All Status" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">All Status</SelectItem>
                                                        <SelectItem value="Paid">Paid</SelectItem>
                                                        <SelectItem value="Partial">Partial</SelectItem>
                                                        <SelectItem value="Pending">Pending</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <DialogFooter className="flex flex-row justify-between items-center pt-2 gap-2">
                                                <Button variant="ghost" className="text-muted-foreground" onClick={() => setFilters(prev => ({ ...prev, status: "all" }))}>
                                                    Clear Filters
                                                </Button>
                                                <DialogClose asChild>
                                                    <Button type="button">Apply</Button>
                                                </DialogClose>
                                            </DialogFooter>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {/* GROUP 2: Export Buttons */}
                            <div className="flex flex-1 md:flex-none gap-2 order-2 md:order-3 overflow-x-auto">
                                <Button variant="outline" size="sm" className="px-2 md:px-4 md:h-10 flex-1 md:flex-none" onClick={exportToExcel}>
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    <span>Excel</span>
                                </Button>
                                <Button variant="outline" size="sm" className="px-2 md:px-4 md:h-10 flex-1 md:flex-none" onClick={exportToPDF}>
                                    <Download className="h-4 w-4 mr-2" />
                                    <span>PDF</span>
                                </Button>
                                <Button size="sm" className="px-2 md:px-4 md:h-10 flex-1 md:flex-none btn-print" onClick={() => window.print()}>
                                    <Printer className="h-4 w-4 mr-2" />
                                    <span>Print</span>
                                </Button>
                            </div>

                            {/* GROUP 3: Search Bar */}
                            <div className="w-full md:flex-1 order-3 md:order-2">
                                <Input
                                    placeholder="Search by Student Name, ID or Coupon..."
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Bulk Actions Bar */}
                        {selectedCouponIds.length > 0 && (
                            <div className="flex items-center justify-between p-2 bg-muted/30 border rounded-md">
                                <span className="text-sm text-muted-foreground ml-2">
                                    {selectedCouponIds.length} selected
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleEdit}
                                        disabled={selectedCouponIds.length !== 1}
                                    >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </Button>
                                    <ConfirmationPopup
                                        action="delete"
                                        title={`Delete ${selectedCouponIds.length} Coupons?`}
                                        description="This action cannot be undone."
                                        onClick={handleBulkDelete}
                                    >
                                        <Button variant="destructive" size="sm">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </Button>
                                    </ConfirmationPopup>
                                </div>
                            </div>
                        )}

                        {activeView === "coupons" && (
                        <div id="printable-table" className="rounded-md border bg-white overflow-x-auto">
                            <div className="hidden print:block text-center mb-6 pt-4">
                                <h2 className="text-2xl font-bold">STUDENT COUPON FUND MANAGEMENT</h2>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={coupons.length > 0 && selectedCouponIds.length === coupons.length}
                                                onCheckedChange={handleSelectAll}
                                            />
                                        </TableHead>
                                        {visibleColumns.slNo && <TableHead>Sl No</TableHead>}
                                        {visibleColumns.id && <TableHead>ID</TableHead>}
                                        {visibleColumns.studentName && <TableHead>Student</TableHead>}
                                        {visibleColumns.year && <TableHead>Year</TableHead>}
                                        {visibleColumns.couponNo && <TableHead>Coupon No</TableHead>}
                                        {visibleColumns.totalAmount && <TableHead>Total Amount</TableHead>}
                                        {visibleColumns.paid && <TableHead>Paid</TableHead>}
                                        {visibleColumns.balance && <TableHead>Balance</TableHead>}
                                        {visibleColumns.status && <TableHead>Status</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!shouldFetchCoupons ? (
                                        <TableRow><TableCell colSpan={10} className="text-center h-24 text-muted-foreground">Loading...</TableCell></TableRow>
                                    ) : isLoading ? (
                                        <TableRow><TableCell colSpan={10} className="text-center h-24"><Loader className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                    ) : coupons.length === 0 ? (
                                        <TableRow><TableCell colSpan={10} className="text-center h-24 text-muted-foreground">No records found</TableCell></TableRow>
                                    ) : (
                                        coupons.map((coupon, index) => (
                                            <TableRow key={coupon._id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedCouponIds.includes(coupon._id)}
                                                        onCheckedChange={(checked) => handleSelectRow(coupon._id, checked)}
                                                    />
                                                </TableCell>
                                                {visibleColumns.slNo && <TableCell>{index + 1}</TableCell>}
                                                {visibleColumns.id && <TableCell>{coupon.studentId?._id}</TableCell>}
                                                {visibleColumns.studentName && (
                                                    <TableCell
                                                        className="font-medium cursor-pointer hover:underline text-primary"
                                                        onClick={() => handleEdit(coupon)}
                                                    >
                                                        {coupon.studentId?.name}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.year && <TableCell>{coupon.academicYear}</TableCell>}
                                                {visibleColumns.couponNo && <TableCell>{coupon.couponNumber || "-"}</TableCell>}
                                                {visibleColumns.totalAmount && <TableCell>₹{coupon.couponAmount}</TableCell>}
                                                {visibleColumns.paid && (
                                                    <TableCell
                                                        className="text-green-600 font-semibold cursor-pointer hover:underline"
                                                        onClick={() => setViewHistoryCoupon(coupon)}
                                                    >
                                                        ₹{coupon.totalPaid}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.balance && (
                                                    <TableCell
                                                        className="text-red-600 font-semibold cursor-pointer hover:underline"
                                                        onClick={() => handlePayBalance(coupon)}
                                                    >
                                                        ₹{coupon.balance}
                                                    </TableCell>
                                                )}
                                                {visibleColumns.status && <TableCell>
                                                    <Badge variant={coupon.status === "Paid" ? "success" : coupon.status === "Partial" ? "warning" : "destructive"}>
                                                        {coupon.status}
                                                    </Badge>
                                                </TableCell>}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            {/* Payment Details Popup */}
                            <Dialog open={isPaymentPopupOpen} onOpenChange={(open) => {
                                setIsPaymentPopupOpen(open);
                                if (!open) setIsSimplePayment(false);
                            }}>
                                <DialogContent className={isSimplePayment ? "sm:max-w-[425px]" : "sm:max-w-[700px]"}>
                                    <DialogHeader>
                                        <DialogTitle>Payment Details</DialogTitle>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <form onSubmit={handleSubmitPayment(onSavePayment)}>
                                            <div className="space-y-4">
                                                {isSimplePayment ? (
                                                    <div className="flex flex-col space-y-4">
                                                        <div className="flex flex-col">
                                                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Student Name:</div>
                                                            <div className="text-xl font-bold text-primary">{simplePaymentStudentName}</div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label>Payment Date</Label>
                                                            <Input type="date" {...registerPayment("date", { required: true })} />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label>Paid Amount</Label>
                                                            <Input
                                                                type="number"
                                                                {...registerPayment("amount", { required: true, min: 0 })}
                                                                placeholder="Enter Amount"
                                                                className="w-full"
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label>Payment Date</Label>
                                                            <Input type="date" {...registerPayment("date", { required: true })} />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label>Academic Year</Label>
                                                            <Select
                                                                onValueChange={(val) => setValuePayment("academicYear", val)}
                                                                defaultValue={String(new Date().getFullYear())}
                                                                value={watchPayment("academicYear")}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select Year" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {getAcademicYears().map((year) => (
                                                                        <SelectItem key={year} value={year}>
                                                                            {year}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label>Select Batch</Label>
                                                            <Select
                                                                value={paymentBatchId}
                                                                onValueChange={(val) => {
                                                                    setPaymentBatchId(val);
                                                                    setPaymentClassId([]);
                                                                    setPaymentStudentId([]);
                                                                }}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select Batch" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="all">Select Batch</SelectItem>
                                                                    {batches.map((batch) => (
                                                                        <SelectItem key={batch._id} value={batch._id}>
                                                                            {batch.name} ({batch.endYear})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label>Select Class</Label>
                                                            <MultiSelect
                                                                options={paymentClasses.map(c => ({ label: c.name, value: c._id }))}
                                                                onValueChange={setPaymentClassId}
                                                                value={paymentClassId}
                                                                placeholder="Select Classes"
                                                                variant="default"
                                                            />
                                                        </div>

                                                        <div className="space-y-2 col-span-2 md:col-span-1">
                                                            <Label>Student Name</Label>
                                                            <MultiSelect
                                                                options={paymentStudents.map(s => ({ label: s.name, value: s._id }))}
                                                                onValueChange={setPaymentStudentId}
                                                                value={paymentStudentId}
                                                                placeholder="Select Students"
                                                                variant="default"
                                                            />
                                                            {paymentStudentId.length > 0 && (
                                                                <p className="text-xs text-muted-foreground">{paymentStudentId.length} student(s) selected</p>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2 col-span-2 md:col-span-1">
                                                            <Label>Paid Amount</Label>
                                                            <div className="flex gap-2">
                                                                <Input
                                                                    type="number"
                                                                    {...registerPayment("amount", { required: true, min: 0 })}
                                                                    placeholder="Enter Amount"
                                                                    className="flex-1"
                                                                />
                                                                <Button type="submit" disabled={isSavingPayment} className="md:hidden flex-1">
                                                                    {isSavingPayment ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                                                    <span className="ml-2">Save</span>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <DialogFooter className="flex flex-row justify-end space-x-2 pt-4 border-t mt-4">
                                                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setIsPaymentPopupOpen(false)}>Cancel</Button>
                                                    <Button type="submit" disabled={isSavingPayment} className={isSimplePayment ? "w-full sm:w-auto" : "hidden md:inline-flex w-full sm:w-auto"}>
                                                        {isSavingPayment ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                                        Save Payment
                                                    </Button>
                                                </DialogFooter>
                                            </div>
                                        </form>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                        )}
                    </>
                )
            }

            {/* Hidden Print Sheet Table */}
            <div id="printable-sheet" className={isPrintingSheet ? "block" : "hidden"}>
                <div className="text-center mb-4 pt-0">
                    <h2 className="text-xl font-bold uppercase">Student Coupon Collection Sheet - {currentYear || "2025"}</h2>
                    <p className="text-md">
                        Batch: {batches.find(b => b._id === detailsBatchId)?.name || "All"} |
                        Class: {detailsClasses.filter(c => detailsClassId.includes(c._id)).map(c => c.name).join(", ") || "All"}
                    </p>
                </div>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] border">Sl No</TableHead>
                                <TableHead className="border">Student ID</TableHead>
                                <TableHead className="border">Student Name</TableHead>
                                <TableHead className="border">Coupon Number</TableHead>
                                <TableHead className="border w-[80px]">Paid</TableHead>
                                <TableHead className="border w-[100px]">Date</TableHead>
                                <TableHead className="border w-[80px]">Paid</TableHead>
                                <TableHead className="border w-[100px]">Amount</TableHead>
                                <TableHead className="border w-[80px]">Paid</TableHead>
                                <TableHead className="border w-[100px]">Amount</TableHead>
                                <TableHead className="border w-[100px]">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bulkStudents.map((student, index) => (
                                <TableRow key={student._id}>
                                    <TableCell className="border text-center">{index + 1}</TableCell>
                                    <TableCell className="border">{student._id}</TableCell>
                                    <TableCell className="border font-medium">{student.name}</TableCell>
                                    <TableCell className="border text-center">{couponNumbers[student._id] || ""}</TableCell>
                                    <TableCell className="border h-12"></TableCell>
                                    <TableCell className="border"></TableCell>
                                    <TableCell className="border"></TableCell>
                                    <TableCell className="border"></TableCell>
                                    <TableCell className="border"></TableCell>
                                    <TableCell className="border"></TableCell>
                                    <TableCell className="border"></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {activeView === "balances" && (
                <div className="rounded-md border bg-white overflow-x-auto p-4 mt-6">
                    <h2 className="text-xl font-bold mb-4">Student Balances</h2>
                    {isFetchingAllYearsCoupons ? (
                        <div className="flex-1 flex items-center justify-center min-h-[200px]">
                            <Loader className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto border rounded-md">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Sl No</TableHead>
                                        <TableHead>Student Name</TableHead>
                                        {balancesReportParams.yearColumns.map(year => (
                                            <TableHead key={year} className="text-right">Year {year}</TableHead>
                                        ))}
                                        <TableHead className="text-right font-bold text-red-600">Total Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {balancesReportParams.studentRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={balancesReportParams.yearColumns.length + 3} className="text-center h-24 text-muted-foreground">
                                                No balances found for the selected criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        balancesReportParams.studentRows.map((student, idx) => (
                                            <TableRow key={student.id}>
                                                <TableCell>{idx + 1}</TableCell>
                                                <TableCell className="font-medium">{student.name}</TableCell>
                                                {balancesReportParams.yearColumns.map(year => (
                                                    <TableCell key={year} className="text-right">
                                                        {student.balances[year] ? `₹${student.balances[year]}` : "-"}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-right font-bold text-red-600">₹{student.totalBalance}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}

            {activeView === "transactions" && (
                <div className="rounded-md border bg-white overflow-x-auto p-4 mt-6">
                    <h2 className="text-xl font-bold mb-4">Transaction History</h2>
                    {isFetchingAllYearsCoupons ? (
                        <div className="flex-1 flex items-center justify-center min-h-[200px]">
                            <Loader className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto border rounded-md">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[80px]">Sl. No.</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Student Name</TableHead>
                                        <TableHead>Academic Year</TableHead>
                                        <TableHead className="text-right">Paid Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactionsReport.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                                No transactions found for the selected criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        transactionsReport.map((tx, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{idx + 1}</TableCell>
                                                <TableCell>{format(tx.date, "dd MMM yyyy")}</TableCell>
                                                <TableCell className="font-medium">{tx.studentName}</TableCell>
                                                <TableCell>{tx.academicYear}</TableCell>
                                                <TableCell className="text-right font-semibold text-green-600">₹{tx.amount}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
