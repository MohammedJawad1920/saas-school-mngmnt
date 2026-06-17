"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { IndianRupee, Plus, Trash2, BadgeIndianRupee, X, Loader2, Filter, Printer, Edit, AlertCircle, Columns, Users, Tags, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ComboBox } from "@/components/ui/combobox";

const statusColor = (status) => {
  if (status === "Paid")    return "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-800";
  if (status === "Partial") return "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-800";
  return "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800";
};

export default function DebtorsClient({ batches, classes, categories: initialCategories, apiKey }) {
  const [categories, setCategories]   = useState(initialCategories);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents]       = useState([]);
  const [debts, setDebts]             = useState([]);
  const [loading, setLoading]         = useState(false);

  // Filters
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  
  const [lookupSearchTerm, setLookupSearchTerm] = useState("");
  const [lookupStudent, setLookupStudent] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [hasLookedUp, setHasLookedUp] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Total Collected Date Range State
  const [collectedFrom, setCollectedFrom] = useState("");
  const [collectedTo, setCollectedTo] = useState("");
  const [collectedCategory, setCollectedCategory] = useState("All");
  const [balanceCategory, setBalanceCategory] = useState("All");
  
  // Local Filter State for Dialog
  const [tempBatch, setTempBatch] = useState("");
  const [tempClass, setTempClass] = useState("");
  const [tempStatus, setTempStatus] = useState("All");
  const [tempCategory, setTempCategory] = useState("All");
  const [tempFromDate, setTempFromDate] = useState("");
  const [tempToDate, setTempToDate] = useState("");

  // Column Visibility
  const [visibleCols, setVisibleCols] = useState({
    slNo: true, studentId: true, student: true, batch: true, category: true, year: true, total: true, paid: true, balance: true, status: true,
  });

  // Popup states
  const [paidDetailsOpen, setPaidDetailsOpen] = useState(false);
  const [paidDetailsDebt, setPaidDetailsDebt] = useState(null);
  const [studentsWiseOpen, setStudentsWiseOpen] = useState(false);
  const [categoryWiseOpen, setCategoryWiseOpen] = useState(false);

  const handleOpenFilter = () => {
    setTempBatch(selectedBatch);
    setTempClass(selectedClass);
    setTempStatus(filterStatus);
    setTempCategory(filterCategory);
    setTempFromDate(filterFromDate);
    setTempToDate(filterToDate);
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setSelectedBatch(tempBatch);
    setSelectedClass(tempClass);
    setFilterStatus(tempStatus);
    setFilterCategory(tempCategory);
    setFilterFromDate(tempFromDate);
    setFilterToDate(tempToDate);
    setFilterOpen(false);
  };

  useEffect(() => {
    const term = lookupSearchTerm.trim().toLowerCase();
    if (!term || !showSearchResults) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setIsLookingUp(true);
      fetch(`/api/users?lookup=${term}&roles=Student`, { headers: { "api-key": apiKey }})
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

  const handleLookupSearch = async () => {
    if (!lookupSearchTerm.trim()) { toast.error("Enter student ID or name"); return; }
    if (searchResults.length > 0) {
        const searchLower = lookupSearchTerm.toLowerCase();
        const exactMatch = searchResults.find(u => 
            String(u.studentSpecificField?.admissionNumber || "").toLowerCase() === searchLower ||
            String(u._id).toLowerCase() === searchLower || 
            String(u.name).toLowerCase() === searchLower
        );
        setLookupStudent(exactMatch || searchResults[0]);
        setHasLookedUp(true);
        setLookupSearchTerm((exactMatch || searchResults[0]).name);
        setShowSearchResults(false);
        return;
    }
    
    setIsLookingUp(true);
    try {
      const res = await fetch(`/api/users?lookup=${lookupSearchTerm}&roles=Student`, { headers: { "api-key": apiKey }});
      const data = await res.json();
      if (data.users && data.users.length > 0) {
        const searchLower = lookupSearchTerm.toLowerCase();
        const exactMatch = data.users.find(u => 
            String(u.studentSpecificField?.admissionNumber || "").toLowerCase() === searchLower ||
            String(u._id).toLowerCase() === searchLower || 
            String(u.name).toLowerCase() === searchLower
        );
        setLookupStudent(exactMatch || data.users[0]);
        setHasLookedUp(true);
        setLookupSearchTerm((exactMatch || data.users[0]).name);
        setShowSearchResults(false);
      } else {
        toast.error("No student found");
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  // Add Debt Dialog
  const [addOpen, setAddOpen]         = useState(false);
  const [addBatch, setAddBatch]       = useState("");
  const [addClass, setAddClass]       = useState("");
  const [addStudents, setAddStudents] = useState([]);
  const [addForm, setAddForm]         = useState({
    studentId: "", category: "", year: new Date().getFullYear().toString(),
    totalAmount: "", note: "",
  });
  const [saving, setSaving]           = useState(false);

  // Edit Debt Dialog
  const [editOpen, setEditOpen]       = useState(false);
  const [editForm, setEditForm]       = useState(null);
  const [editing, setEditing]         = useState(false);

  // Bulk Delete
  const [selectedDebts, setSelectedDebts] = useState([]);
  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [deleting, setDeleting]           = useState(false);

  // Pay Dialog
  const [payOpen, setPayOpen]         = useState(false);
  const [payDebt, setPayDebt]         = useState(null);
  const [payAmount, setPayAmount]     = useState("");
  const [payDate, setPayDate]         = useState(new Date().toISOString().split("T")[0]);
  const [payNote, setPayNote]         = useState("");
  const [paying, setPaying]           = useState(false);

  // Fetch students for Main Table
  useEffect(() => {
    const sBatch = selectedBatch === "none" ? "" : selectedBatch;
    const sClass = selectedClass === "none" ? "" : selectedClass;
    if (!sBatch && !sClass) { setStudents([]); return; }
    
    const params = new URLSearchParams({ roles: "Student", projection: "id,name,studentSpecificField.admissionNumber,studentSpecificField.batchId,studentSpecificField.classId,batchId,classId" });
    if (sBatch) params.append("batchId", sBatch);
    if (sClass) params.append("classId", sClass);
    if (sClass && !sBatch) params.append("status", "Active");

    fetch(`/api/users?${params.toString()}`, { headers: { "api-key": apiKey } })
      .then((r) => r.json())
      .then((d) => setStudents(d.users || d || []))
      .catch(() => setStudents([]));
  }, [selectedBatch, selectedClass, apiKey]);

  // Fetch students for Add Debt Popup
  useEffect(() => {
    if (!addOpen) return;
    const aBatch = addBatch === "none" ? "" : addBatch;
    const aClass = addClass === "none" ? "" : addClass;
    
    const params = new URLSearchParams({ roles: "Student", projection: "id,name,studentSpecificField.admissionNumber,studentSpecificField.batchId,studentSpecificField.classId,batchId,classId" });
    if (aBatch) params.append("batchId", aBatch);
    if (aClass) params.append("classId", aClass);
    if (aClass && !aBatch) params.append("status", "Active");

    fetch(`/api/users?${params.toString()}`, { headers: { "api-key": apiKey } })
      .then((r) => r.json())
      .then((d) => setAddStudents(d.users || d || []))
      .catch(() => setAddStudents([]));
  }, [addBatch, addClass, apiKey, addOpen]);

  // Fetch debts
  const fetchDebts = useCallback(async () => {
    const sBatch = selectedBatch === "none" ? "" : selectedBatch;
    const sClass = selectedClass === "none" ? "" : selectedClass;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sBatch) params.append("batchId", sBatch);
      if (sClass) params.append("classId", sClass);
      params.append("t", Date.now().toString());
      
      const res = await fetch(`/api/debtors?${params.toString()}`, { 
        headers: { "api-key": apiKey },
        cache: "no-store"
      });
      const data = await res.json();
      setDebts(data.debts || []);
      setSelectedDebts([]); // reset selection
    } catch {
      toast.error("Failed to load debts");
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, selectedClass, apiKey]);

  useEffect(() => { fetchDebts(); }, [fetchDebts]);

  // Add Debt Submit
  const handleAddDebt = async (e) => {
    e.preventDefault();
    let finalBatch = addBatch === "none" ? "" : addBatch;
    let finalClass = addClass === "none" ? "" : addClass;

    if (!finalBatch || !finalClass) {
        const student = addStudents.find((s) => (s._id || s.id) === addForm.studentId);
        if (student) {
            if (!finalBatch) finalBatch = student.studentSpecificField?.batchId || student.batchId || "";
            if (!finalClass) finalClass = student.studentSpecificField?.classId || student.classId || "";
        }
    }

    if (!addForm.studentId || !addForm.category || !addForm.totalAmount) {
      toast.error("Fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/debtors", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({ ...addForm, batchId: finalBatch, classId: finalClass }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Debt added");
        setAddOpen(false);
        setCategories((prev) => {
          if (!prev.some(c => c.name === addForm.category.toUpperCase())) {
            return [...prev, { _id: Date.now().toString(), name: addForm.category.toUpperCase() }];
          }
          return prev;
        });
        setAddForm({ studentId: "", category: "", year: new Date().getFullYear().toString(), totalAmount: "", note: "" });
        setAddBatch(""); setAddClass("");
        fetchDebts();
      } else {
        toast.error(data.error || "Failed to add debt");
      }
    } finally {
      setSaving(false);
    }
  };

  // Edit Debt Submit
  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editForm.category || !editForm.totalAmount) { toast.error("Fill required fields"); return; }
    setEditing(true);
    try {
      const res = await fetch("/api/debtors", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          id: editForm._id,
          category: editForm.category.toUpperCase(),
          year: editForm.year,
          totalAmount: Number(editForm.totalAmount),
          note: editForm.note,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Debt updated");
        setEditOpen(false);
        setCategories((prev) => {
          if (!prev.some(c => c.name === editForm.category.toUpperCase())) {
            return [...prev, { _id: Date.now().toString(), name: editForm.category.toUpperCase() }];
          }
          return prev;
        });
        setEditForm(null);
        fetchDebts();
      } else toast.error(data.error || "Failed to update debt");
    } finally { setEditing(false); }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/debtors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({ ids: selectedDebts }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Deleted successfully");
        setSelectedDebts([]);
        setDeleteOpen(false);
        fetchDebts();
      } else toast.error(data.error || "Failed to delete");
    } finally { setDeleting(false); }
  };

  // Pay Submit
  const handlePay = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) { toast.error("Enter a valid amount"); return; }
    setPaying(true);
    try {
      const res = await fetch("/api/debtors", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "api-key": apiKey },
        body: JSON.stringify({
          id: payDebt._id,
          payment: { amount: Number(payAmount), date: payDate, note: payNote },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Payment recorded");
        setPayOpen(false);
        setPayAmount(""); setPayNote("");
        fetchDebts();
      } else {
        toast.error(data.error || "Failed to record payment");
      }
    } finally {
      setPaying(false);
    }
  };

  const studentName = (id) => {
    if (typeof id === "object" && id !== null) return id.name;
    let st = students.find((s) => (s._id || s.id) === id) || addStudents.find((s) => (s._id || s.id) === id);
    return st?.name || id;
  };

  const getStudentAdmissionNo = (id) => {
    if (typeof id === "object" && id !== null) return id.studentSpecificField?.admissionNumber || id._id;
    let st = students.find((s) => (s._id || s.id) === id) || addStudents.find((s) => (s._id || s.id) === id);
    return st?.studentSpecificField?.admissionNumber || (st?._id || st?.id) || id;
  };

  const filteredDebts = debts.filter(d => {
    if (hasLookedUp && lookupStudent) {
        const sId = typeof d.studentId === "object" && d.studentId !== null ? d.studentId._id : d.studentId;
        if (sId !== lookupStudent._id) return false;
    }

    const paid = (d.payments || []).reduce((s, p) => s + p.amount, 0);
    const status = paid >= d.totalAmount ? "Paid" : paid > 0 ? "Partial" : "Pending";
    
    if (filterStatus !== "All" && status !== filterStatus) return false;
    if (filterCategory !== "All" && d.category !== filterCategory) return false;
    
    const dDate = d.createdAt ? d.createdAt.substring(0, 10) : null;
    if (filterFromDate && dDate && dDate < filterFromDate) return false;
    if (filterToDate && dDate && dDate > filterToDate) return false;
    
    return true;
  });

  const totalCollected = useMemo(() => {
    let total = 0;
    filteredDebts.forEach(d => {
      if (collectedCategory !== "All" && d.category !== collectedCategory) return;
      (d.payments || []).forEach(p => {
        if (!p.amount) return;
        const pDate = p.date ? new Date(p.date).toISOString().substring(0, 10) : null;
        if (collectedFrom && pDate && pDate < collectedFrom) return;
        if (collectedTo && pDate && pDate > collectedTo) return;
        total += p.amount;
      });
    });
    return total;
  }, [filteredDebts, collectedFrom, collectedTo, collectedCategory]);

  const totalBalance = useMemo(() => {
    let balance = 0;
    filteredDebts.forEach(d => {
      if (balanceCategory !== "All" && d.category !== balanceCategory) return;
      const paid = (d.payments || []).reduce((s, p) => s + p.amount, 0);
      balance += (d.totalAmount - paid);
    });
    return balance;
  }, [filteredDebts, balanceCategory]);

  const studentsWiseData = useMemo(() => {
    const map = {};
    filteredDebts.forEach(d => {
      const sId = typeof d.studentId === "object" && d.studentId !== null ? d.studentId._id : d.studentId;
      if (!map[sId]) map[sId] = { studentId: d.studentId, total: 0, paid: 0, balance: 0 };
      const paid = (d.payments || []).reduce((s, p) => s + p.amount, 0);
      map[sId].total += d.totalAmount;
      map[sId].paid += paid;
      map[sId].balance += (d.totalAmount - paid);
    });
    return Object.values(map).sort((a, b) => b.balance - a.balance);
  }, [filteredDebts]);

  const categoryWiseData = useMemo(() => {
    const map = {};
    filteredDebts.forEach(d => {
      if (!map[d.category]) map[d.category] = { category: d.category, count: 0, total: 0, paid: 0, balance: 0 };
      const paid = (d.payments || []).reduce((s, p) => s + p.amount, 0);
      map[d.category].count += 1;
      map[d.category].total += d.totalAmount;
      map[d.category].paid += paid;
      map[d.category].balance += (d.totalAmount - paid);
    });
    return Object.values(map).sort((a, b) => b.balance - a.balance);
  }, [filteredDebts]);

  return (
    <div className="p-2 space-y-4">
      {/* Top Cards: Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-2">
        
        {/* Left Column */}
        <div className="flex flex-col gap-2 h-full">
            {/* Student Lookup Card */}
            <Card className="w-full shadow-sm flex-1 flex flex-col justify-center">
                <CardHeader className="bg-muted/10 pb-6 pt-6 flex-1 rounded-t-xl">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    Student Lookup
                </CardTitle>
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
                            className="w-full pr-10 bg-background"
                        />
                        {(hasLookedUp || lookupSearchTerm) && (
                            <Button
                                variant="ghost" size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-transparent"
                                onClick={() => {
                                    setLookupSearchTerm(""); setHasLookedUp(false); setLookupStudent(null); setShowSearchResults(false);
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                        
                        {/* Search Results Dropdown */}
                        {showSearchResults && searchResults.length > 0 && (
                            <div className="absolute z-[999] left-0 right-0 top-full mt-1 bg-popover border rounded-md shadow-lg max-h-[400px] overflow-y-auto">
                                {searchResults.map((student) => {
                                    const batch = batches.find(b => b._id === (student.studentSpecificField?.batchId || student.batchId));
                                    const cls = classes.find(c => c._id === (student.studentSpecificField?.classId || student.classId));
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
                                                    <span>ID: {student.studentSpecificField?.admissionNumber || student._id}</span>
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
                        onClick={() => lookupSearchTerm ? handleLookupSearch() : {}}
                        disabled={isLookingUp}
                        className="bg-black text-white hover:bg-white hover:text-black border border-black h-10 w-10 p-0 flex items-center justify-center shrink-0"
                    >
                        {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                </div>
            </CardHeader>
        </Card>

        {/* Total Debt Balance Card */}
        <Card className="w-full border-red-500/20 shadow-sm bg-red-500/5 flex-1 flex flex-col justify-center">
            <CardContent className="h-full pt-4 pb-4 flex flex-col justify-center items-center relative gap-2">
                <div className="w-full max-w-sm bg-background/50 backdrop-blur-sm px-2 py-1 rounded-md border border-red-500/20 relative">
                    <div className="space-y-0.5">
                        <Label className="text-xs text-muted-foreground">Category</Label>
                        <Select value={balanceCategory} onValueChange={setBalanceCategory}>
                          <SelectTrigger className="h-8 bg-background"><SelectValue placeholder="All Categories" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All">All Categories</SelectItem>
                            {categories.map((c) => <SelectItem key={c._id || c.name} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                    </div>
                    {balanceCategory !== "All" && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 shadow-sm z-10" 
                            onClick={() => setBalanceCategory("All")}
                            title="Clear Filter"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                <div className="flex flex-col items-center space-y-1">
                    <div className="text-sm md:text-base font-semibold uppercase tracking-widest text-muted-foreground text-center">
                        Total Debt Balance
                    </div>
                    <div className="text-4xl md:text-5xl font-bold text-red-600 tabular-nums">
                        ₹{totalBalance.toLocaleString()}
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

        {/* Right Column: Total Amount Summary Card */}
        <Card className="w-full border-green-500/20 shadow-sm bg-green-500/5 h-full">
            <CardContent className="h-full pt-6 pb-6 flex flex-col justify-center items-center relative gap-4">
                <div className="w-full max-w-sm grid grid-cols-2 gap-2 bg-background/50 backdrop-blur-sm p-2 rounded-md border border-green-500/20 relative">
                    <div className="space-y-0.5">
                        <Label className="text-xs text-muted-foreground">From Date</Label>
                        <Input type="date" value={collectedFrom} onChange={e => setCollectedFrom(e.target.value)} />
                    </div>
                    <div className="space-y-0.5">
                        <Label className="text-xs text-muted-foreground">To Date</Label>
                        <Input type="date" value={collectedTo} onChange={e => setCollectedTo(e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">Category</Label>
                        <Select value={collectedCategory} onValueChange={setCollectedCategory}>
                          <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="All Categories" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All">All Categories</SelectItem>
                            {categories.map((c) => <SelectItem key={c._id || c.name} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                    </div>
                    {(collectedFrom || collectedTo || collectedCategory !== "All") && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 shadow-sm z-10" 
                            onClick={() => { setCollectedFrom(""); setCollectedTo(""); setCollectedCategory("All"); }}
                            title="Clear Filters"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                <div className="flex flex-col items-center space-y-2 mt-2">
                    <div className="text-sm md:text-base font-semibold uppercase tracking-widest text-muted-foreground text-center">
                        Total Collected Amount
                    </div>
                    <div className="text-4xl md:text-5xl font-bold text-green-600 tabular-nums">
                        ₹{totalCollected.toLocaleString()}
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      {hasLookedUp && lookupStudent && (
          <Card className="w-full border-primary/20 shadow-sm relative overflow-hidden bg-card mb-2">
              <CardContent className="pt-6">
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
                          </div>
                      </div>
                      <div className="hidden sm:block text-right self-start md:self-center">
                          <Badge variant={lookupStudent.studentSpecificField?.status === "Active" ? "outline" : "secondary"} className={lookupStudent.studentSpecificField?.status === "Active" ? "bg-green-50 text-green-700 border-green-200" : ""}>
                              {lookupStudent.studentSpecificField?.status || "Unknown"}
                          </Badge>
                      </div>
                  </div>
              </CardContent>
          </Card>
      )}

      {/* Header Row */}
      <div className="flex flex-wrap gap-3 items-end no-print">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Columns</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuCheckboxItem
              className="font-bold border-b mb-1"
              checked={Object.values(visibleCols).every(Boolean)}
              onCheckedChange={(checked) => {
                const newCols = {};
                Object.keys(visibleCols).forEach(k => newCols[k] = checked);
                setVisibleCols(newCols);
              }}
            >
              Toggle All
            </DropdownMenuCheckboxItem>
            {Object.keys(visibleCols).map((k) => (
              <DropdownMenuCheckboxItem
                key={k}
                className="capitalize"
                checked={visibleCols[k]}
                onCheckedChange={(checked) => setVisibleCols((prev) => ({ ...prev, [k]: checked }))}
              >
                {k}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={handleOpenFilter}>
              <Filter className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Filter Data</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Filter Debts</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Batch</Label>
                <Select value={tempBatch} onValueChange={setTempBatch}>
                  <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {batches.map((b) => <SelectItem key={b._id || b.id} value={b._id || b.id}>{b.name} {b.startYear ? `(${b.startYear})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Class</Label>
                <Select value={tempClass} onValueChange={setTempClass}>
                  <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {classes.map((c) => <SelectItem key={c._id || c.id} value={c._id || c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={tempStatus} onValueChange={setTempStatus}>
                  <SelectTrigger><SelectValue placeholder="Any Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={tempCategory} onValueChange={setTempCategory}>
                  <SelectTrigger><SelectValue placeholder="Any Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {categories.map((c) => <SelectItem key={c._id || c.name} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>From Date</Label>
                  <Input type="date" value={tempFromDate} onChange={e => setTempFromDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>To Date</Label>
                  <Input type="date" value={tempToDate} onChange={e => setTempToDate(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setFilterOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={applyFilter}>Apply</Button>
              </div>

              <Button variant="outline" className="w-full text-xs" onClick={() => {
                setTempBatch("none"); setTempClass("none"); setTempStatus("All"); setTempCategory("All"); setTempFromDate(""); setTempToDate("");
              }}>Clear All Filters</Button>
            </div>
          </DialogContent>
        </Dialog>

        {selectedDebts.length > 0 && (
           <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
             <Trash2 className="h-4 w-4 mr-1" /> Delete Selected ({selectedDebts.length})
           </Button>
        )}

        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => setStudentsWiseOpen(true)}>
            <Users className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Students Wise</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCategoryWiseOpen(true)}>
            <Tags className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Category Wise</span>
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setAddOpen(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Add Debt</span>
          </Button>
          <Button variant="default" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>



      {/* Debts Table */}
      <div className="rounded-md border overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredDebts.length === 0 ? (
          <div className="text-center text-muted-foreground p-12">No debt records found matching your filters.</div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-12 no-print">
                  <Checkbox 
                    checked={selectedDebts.length === filteredDebts.length && filteredDebts.length > 0} 
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedDebts(filteredDebts.map(d => d._id));
                      else setSelectedDebts([]);
                    }} 
                  />
                </TableHead>
                {visibleCols.slNo && <TableHead>Sl No</TableHead>}
                {visibleCols.studentId && <TableHead>Student ID</TableHead>}
                {visibleCols.student && <TableHead>Student</TableHead>}
                {visibleCols.batch && <TableHead>Batch</TableHead>}
                {visibleCols.category && <TableHead>Category</TableHead>}
                {visibleCols.year && <TableHead>Year</TableHead>}
                {visibleCols.total && <TableHead className="text-right">Total</TableHead>}
                {visibleCols.paid && <TableHead className="text-right">Paid</TableHead>}
                {visibleCols.balance && <TableHead className="text-right">Balance</TableHead>}
                {visibleCols.status && <TableHead>Status</TableHead>}
                <TableHead className="no-print">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDebts.map((debt, i) => {
                const paid    = (debt.payments || []).reduce((s, p) => s + p.amount, 0);
                const balance = debt.totalAmount - paid;
                const status  = paid >= debt.totalAmount ? "Paid" : paid > 0 ? "Partial" : "Pending";
                return (
                  <TableRow key={debt._id} className="hover:bg-muted/30">
                    <TableCell className="no-print">
                      <Checkbox 
                        checked={selectedDebts.includes(debt._id)}
                        onCheckedChange={(c) => {
                          if (c) setSelectedDebts([...selectedDebts, debt._id]);
                          else setSelectedDebts(selectedDebts.filter(id => id !== debt._id));
                        }}
                      />
                    </TableCell>
                    {visibleCols.slNo && <TableCell>{i + 1}</TableCell>}
                    {visibleCols.studentId && <TableCell>{getStudentAdmissionNo(debt.studentId)}</TableCell>}
                    {visibleCols.student && <TableCell className="font-medium">{studentName(debt.studentId)}</TableCell>}
                    {visibleCols.batch && <TableCell>{batches.find(b => (b._id || b.id) === (debt.batchId?._id || debt.batchId))?.name || "-"}</TableCell>}
                    {visibleCols.category && <TableCell>{debt.category}</TableCell>}
                    {visibleCols.year && <TableCell>{debt.year}</TableCell>}
                    {visibleCols.total && <TableCell className="text-right">₹{debt.totalAmount.toLocaleString()}</TableCell>}
                    {visibleCols.paid && (
                      <TableCell className="text-right text-green-600 dark:text-green-400">
                        {paid > 0 ? (
                          <button 
                            className="underline hover:text-green-800 dark:hover:text-green-300 focus:outline-none"
                            onClick={() => { setPaidDetailsDebt(debt); setPaidDetailsOpen(true); }}
                          >
                            ₹{paid.toLocaleString()}
                          </button>
                        ) : (
                          <span>₹0</span>
                        )}
                      </TableCell>
                    )}
                    {visibleCols.balance && <TableCell className="text-right font-bold text-red-600 dark:text-red-400">₹{balance.toLocaleString()}</TableCell>}
                    {visibleCols.status && (
                      <TableCell>
                        <Badge variant="outline" className={statusColor(status)}>{status}</Badge>
                      </TableCell>
                    )}
                    <TableCell className="flex gap-1 no-print">
                      {status !== "Paid" && (
                        <Button
                          size="sm" variant="outline"
                          className="text-green-600 border-green-300 hover:bg-green-50"
                          onClick={() => { setPayDebt(debt); setPayOpen(true); }}
                        >
                          <BadgeIndianRupee className="h-4 w-4 mr-1" /> Pay
                        </Button>
                      )}
                      <Button
                        size="sm" variant="outline"
                        onClick={() => { setEditForm({ ...debt }); setEditOpen(true); }}
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Debt Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Debt Record</DialogTitle></DialogHeader>
          <form onSubmit={handleAddDebt} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <Label>Batch</Label>
                 <Select value={addBatch} onValueChange={setAddBatch}>
                   <SelectTrigger><SelectValue placeholder="Batch" /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="none">None</SelectItem>
                     {batches.map((b) => <SelectItem key={b._id || b.id} value={b._id || b.id}>{b.name} {b.startYear ? `(${b.startYear})` : ""}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-1">
                 <Label>Class</Label>
                 <Select value={addClass} onValueChange={setAddClass}>
                   <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="none">None</SelectItem>
                     {classes.map((c) => <SelectItem key={c._id || c.id} value={c._id || c.id}>{c.name}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
            </div>
            <div className="space-y-1">
              <Label>Student *</Label>
              <ComboBox
                items={addStudents.map(s => ({
                  value: s._id || s.id,
                  label: `${s.name} (${s.studentSpecificField?.admissionNumber || s._id || s.id})`
                }))}
                value={addForm.studentId}
                onSelect={(v) => setAddForm((p) => ({ ...p, studentId: v }))}
                placeholder="Select Student"
              />
            </div>
            <div className="space-y-1">
              <Label>Category *</Label>
              <Input
                list="debt-categories"
                value={addForm.category}
                onChange={(e) => setAddForm((p) => ({ ...p, category: e.target.value.toUpperCase() }))}
                placeholder="Select or type Category"
                required
              />
              <datalist id="debt-categories">
                {categories.map((c) => (
                  <option key={c._id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Year *</Label>
                <Input value={addForm.year} onChange={(e) => setAddForm((p) => ({ ...p, year: e.target.value }))} placeholder="2024-25" required />
              </div>
              <div className="space-y-1">
                <Label>Total Amount *</Label>
                <Input type="number" min={1} value={addForm.totalAmount} onChange={(e) => setAddForm((p) => ({ ...p, totalAmount: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Input value={addForm.note} onChange={(e) => setAddForm((p) => ({ ...p, note: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Debt Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Debt Record</DialogTitle></DialogHeader>
          {editForm && (
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="space-y-1">
                <Label>Category *</Label>
                <Input
                  list="debt-categories"
                  value={editForm.category}
                  onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Year *</Label>
                  <Input value={editForm.year} onChange={(e) => setEditForm((p) => ({ ...p, year: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Total Amount *</Label>
                  <Input type="number" min={1} value={editForm.totalAmount} onChange={(e) => setEditForm((p) => ({ ...p, totalAmount: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Input value={editForm.note || ""} onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={editing}>
                  {editing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Update
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm text-center">
           <div className="flex flex-col items-center justify-center gap-4 py-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Delete {selectedDebts.length} Records?</h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete the selected debt records? This action cannot be undone.
                </p>
              </div>
           </div>
           <DialogFooter className="sm:justify-center">
             <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
             <Button type="button" variant="destructive" onClick={handleBulkDelete} disabled={deleting}>
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Delete
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment — {studentName(payDebt?.studentId)}</DialogTitle>
          </DialogHeader>
          {payDebt && (
            <form onSubmit={handlePay} className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Category: <span className="font-semibold text-foreground">{payDebt.category}</span> &nbsp;|&nbsp;
                Balance: <span className="font-bold text-red-600">
                  ₹{(payDebt.totalAmount - (payDebt.payments || []).reduce((s, p) => s + p.amount, 0)).toLocaleString()}
                </span>
              </div>
              <div className="space-y-1">
                <Label>Amount *</Label>
                <Input type="number" min={1} max={payDebt.totalAmount - (payDebt.payments || []).reduce((s, p) => s + p.amount, 0)} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Note</Label>
                <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={paying} className="bg-green-600 hover:bg-green-700 text-white">
                  {paying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirm Payment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Paid Details Dialog */}
      <Dialog open={paidDetailsOpen} onOpenChange={setPaidDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Payment Details</DialogTitle></DialogHeader>
          {paidDetailsDebt && (
            <div className="space-y-4">
              <div className="text-sm">
                Student: <b>{studentName(paidDetailsDebt.studentId)}</b><br/>
                Category: <b>{paidDetailsDebt.category}</b>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(paidDetailsDebt.payments || []).map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{p.date ? new Date(p.date).toLocaleDateString() : "-"}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">₹{p.amount.toLocaleString()}</TableCell>
                      <TableCell>{p.note || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {(paidDetailsDebt.payments || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">No payments recorded</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Students Wise Dialog */}
      <Dialog open={studentsWiseOpen} onOpenChange={setStudentsWiseOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Students Wise Summary</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Sl No</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead className="text-right">Total Debt</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentsWiseData.map((d, idx) => (
                <TableRow key={idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{getStudentAdmissionNo(d.studentId)}</TableCell>
                  <TableCell className="font-medium">{studentName(d.studentId)}</TableCell>
                  <TableCell className="text-right">₹{d.total.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-green-600 dark:text-green-400">₹{d.paid.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold text-red-600 dark:text-red-400">₹{d.balance.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {studentsWiseData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No data available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Category Wise Dialog */}
      <Dialog open={categoryWiseOpen} onOpenChange={setCategoryWiseOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Category Wise Summary</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead className="text-right">Total Debt</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryWiseData.map((d, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{d.category}</TableCell>
                  <TableCell className="text-right">{d.count}</TableCell>
                  <TableCell className="text-right">₹{d.total.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-green-600">₹{d.paid.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-bold text-red-600">₹{d.balance.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {categoryWiseData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No data available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
