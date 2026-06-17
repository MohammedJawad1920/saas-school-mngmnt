"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, ScanBarcode, X, Loader2, ChevronDown, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
];

const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export default function StudentAttendanceLookup({ students = [], type = "student", setFilter, removeFilter, filterMonth, filterYear, tableData = [], apiKey, classes = [], toppersOnly, setToppersOnly }) {
    const isMobile = useIsMobile();
    const [query, setQuery] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [toppersOpen, setToppersOpen] = useState(false);
    const [toppersData, setToppersData] = useState([]);
    const [loadingToppers, setLoadingToppers] = useState(false);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);

    // Filter students based on query
    const filteredStudents = students.filter((s) => {
        const q = query.trim().toLowerCase();
        if (!q) return false;
        
        const basicMatch = (
            s.name?.toLowerCase().includes(q) ||
            String(s._id)?.toLowerCase().includes(q)
        );

        if (type === "teacher") return basicMatch;

        return (
            basicMatch ||
            s.studentSpecificField?.admissionNumber?.toLowerCase().includes(q)
        );
    }).slice(0, 50);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClick(e) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target) &&
                !inputRef.current.contains(e.target)
            ) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const fetchRecords = useCallback(async (studentId, m, y) => {
        setLoading(true);
        try {
            const endpoint = type === "student" 
                ? `/api/student-attendance-lookup?studentId=${studentId}&month=${m}&year=${y}`
                : `/api/teacher-attendance-lookup?teacherId=${studentId}&month=${m}&year=${y}`;
            
            const res = await fetch(endpoint);
            const data = await res.json();
            setRecords(data.records || []);
        } catch {
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSelectStudent = (student) => {
        setSelectedStudent(student);
        setQuery(student.name);
        setShowDropdown(false);
        setOpen(true);
        fetchRecords(student._id, month, year);
    };

    const handleMonthYearChange = (m, y) => {
        setMonth(m);
        setYear(y);
        if (selectedStudent) {
            fetchRecords(selectedStudent._id, m, y);
        }
    };

    const handleSearchSubmit = () => {
        const q = query.trim().toLowerCase();
        if (!q || filteredStudents.length === 0) return;

        const exactMatch = filteredStudents.find(s => {
            const match = String(s._id).toLowerCase() === q || s.name?.toLowerCase() === q;
            if (type === "teacher") return match;
            return match || s.studentSpecificField?.admissionNumber?.toLowerCase() === q;
        });

        if (!exactMatch && filteredStudents.length > 1) {
            toast.info(`Showing best match: ${filteredStudents[0].name}`);
        }

        handleSelectStudent(exactMatch || filteredStudents[0]);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearchSubmit();
        }
    };

    const handleScanClick = () => {
        setScanning(true);
        setTimeout(() => setScanning(false), 1200);
        inputRef.current?.focus();
    };

    const { totalPresent, totalAbsent, percentage } = useMemo(() => {
        const present = records.filter(r => r.present).length;
        const absent = records.length - present;
        const perc = records.length > 0 ? (present / records.length) * 100 : 0;
        return { totalPresent: present, totalAbsent: absent, percentage: perc };
    }, [records]);

    const handleToppersToggle = () => {
        setToppersOpen(true);
        setLoadingToppers(true);

        const classMap = {};

        if (tableData && tableData.length > 0) {
            tableData.forEach(student => {
                const records = student.attendanceRecords || [];
                const className = student.className || (records.length > 0 ? records[0].className : null);
                const classId = student.classId || (records.length > 0 ? records[0].classId : null);

                let percentage = 0;
                if (student.percentage !== undefined && student.percentage !== null) {
                    percentage = Number(student.percentage);
                } else if (records.length > 0) {
                    const total = records.length;
                    const present = records.filter(r => r.present || r.status === "Present").length;
                    percentage = Math.round((present / total) * 100 * 10) / 10;
                } else {
                    return;
                }

                const key = classId || className || "Unknown Class";

                if (!classMap[key] || classMap[key].percentage < percentage) {
                    classMap[key] = {
                        _id: student._id,
                        name: student.name,
                        percentage: percentage,
                        className: className || "Unknown Class",
                        classId: classId
                    };
                }
            });
        }

        let finalToppers = [];
        if (classes && classes.length > 0) {
            finalToppers = classes.map(cls => {
                const topperFound = Object.values(classMap).find(t =>
                    (t.classId && t.classId === cls.value) ||
                    (t.className && t.className === cls.label)
                );

                if (topperFound) return topperFound;

                return {
                    _id: "-",
                    name: "-",
                    percentage: 0,
                    className: cls.label,
                    classId: cls.value
                };
            });
        } else {
            finalToppers = Object.values(classMap).sort((a, b) => a.className?.localeCompare(b.className));
        }

        setToppersData(finalToppers);
        setLoadingToppers(false);
    };

    return (
        <>
            <div className={cn(
                "flex items-center gap-2",
                isMobile ? "w-full" : ""
            )}>
                {/* Scanner Search Bar */}
                <div className={cn(
                    "relative flex items-center gap-2",
                    isMobile ? "flex-1" : ""
                )}>
                    {/* Search Input Container for precise dropdown alignment */}
                    <div className={cn(
                        "relative",
                        isMobile ? "flex-1" : "w-full sm:w-64 md:w-[320px]"
                    )}>
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            ref={inputRef}
                            placeholder={type === "student" ? "Search student..." : "Search teacher..."}
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            onKeyDown={handleKeyDown}
                            className="pl-8 pr-8 h-9 text-sm border-border bg-background w-full"
                        />
                        {query && (
                            <button
                                onClick={() => {
                                    setQuery("");
                                    setSelectedStudent(null);
                                }}
                                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                                type="button"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}

                        {/* Search Dropdown - Perfectly aligned under the input */}
                        {showDropdown && filteredStudents.length > 0 && (
                            <div
                                ref={dropdownRef}
                                className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg z-[100] max-h-60 overflow-y-auto"
                            >
                                {filteredStudents.map((s) => (
                                    <div
                                        key={s._id}
                                        className="p-2 hover:bg-neutral-100 cursor-pointer flex items-center gap-2 border-b border-neutral-50 last:border-0"
                                        onClick={() => handleSelectStudent(s)}
                                    >
                                        <Avatar className="h-7 w-7">
                                            <AvatarImage src={s.profilePic?.url} />
                                            <AvatarFallback className="text-[10px]">{s.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-xs font-medium truncate">{s.name}</span>
                                            <span className="text-[10px] text-muted-foreground">{s.studentSpecificField?.admissionNumber || s._id}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Scanner / Search button */}
                    <Button
                        size="icon"
                        variant={query ? "default" : "outline"}
                        onClick={(e) => {
                            e.preventDefault();
                            if (query) {
                                handleSearchSubmit();
                            } else {
                                handleScanClick();
                            }
                        }}
                        className={!query ? "flex-shrink-0 bg-foreground text-background hover:bg-foreground/90 hover:text-white border-none h-9 w-9" : "px-3 h-9 w-auto flex-shrink-0"}
                        type="button"
                    >
                        {query ? (
                            <Search className="h-4 w-4" />
                        ) : (
                            <ScanBarcode className={`h-4 w-4 transition-colors ${scanning ? "animate-pulse" : ""}`} />
                        )}
                    </Button>

                    {/* Toppers Filter Toggle - Desktop only in this component as Row 2 handles it for mobile */}
                    {!isMobile && type === "student" && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                className={`h-9 px-3 border-border transition-all flex items-center gap-2 ${toppersOnly ? "bg-green-50 border-green-200 shadow-sm" : "bg-white text-black hover:bg-neutral-100"}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const currentToppersOnly = (typeof toppersOnly !== 'undefined' ? toppersOnly :
                                        (typeof window !== 'undefined' ? window.__TOPPERS_ONLY__ : false));

                                    const nextValue = !currentToppersOnly;
                                    
                                    if (typeof setToppersOnly === 'function') {
                                        setToppersOnly(nextValue);
                                    } else if (typeof window !== 'undefined' && window.__SET_TOPPERS__) {
                                        window.__SET_TOPPERS__(nextValue);
                                    }
                                }}
                                title="Green Listed Students (Toppers)"
                            >
                                <Trophy 
                                    className={cn(
                                        "h-4 w-4 transition-colors", 
                                        toppersOnly ? "text-green-500" : "text-black"
                                    )} 
                                    fill={toppersOnly ? "currentColor" : "none"}
                                    strokeWidth={2.5}
                                />
                                <span className={cn("font-medium text-sm", toppersOnly ? "text-green-700" : "text-black")}>Toppers</span>
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Record Details Modal */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
                    <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-background shrink-0">
                        <div className="flex justify-between items-start gap-4">
                            <DialogTitle className="text-xl font-bold flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-primary/10">
                                    <AvatarImage src={selectedStudent?.profilePic?.url} />
                                    <AvatarFallback className="bg-primary/5 text-primary">
                                        {selectedStudent?.name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span>{type === "student" ? "Student" : "Teacher"} Attendance History</span>
                                    <span className="text-sm font-medium text-muted-foreground">
                                        {selectedStudent?.name}
                                    </span>
                                </div>
                            </DialogTitle>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-3 overflow-hidden">
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <select
                                    value={year}
                                    onChange={(e) => handleMonthYearChange(month, parseInt(e.target.value))}
                                    className="h-8 px-2 text-xs rounded-md border border-border bg-background"
                                >
                                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select
                                    value={month}
                                    onChange={(e) => handleMonthYearChange(parseInt(e.target.value), year)}
                                    className="h-8 px-2 text-xs rounded-md border border-border bg-background"
                                >
                                    {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>

                            {/* Attendance Summary Strip */}
                            {!loading && records.length > 0 && (
                                <div className="flex items-center gap-3 ml-auto px-3 py-1 bg-neutral-50 border border-border/50 rounded-lg shadow-sm">
                                    <div className="flex flex-col items-center min-w-[45px]">
                                        <span className="text-[9px] uppercase font-bold text-neutral-500">Present</span>
                                        <span className="text-sm font-bold text-green-600">{totalPresent}</span>
                                    </div>
                                    <div className="w-px h-6 bg-border mx-1" />
                                    <div className="flex flex-col items-center min-w-[45px]">
                                        <span className="text-[9px] uppercase font-bold text-neutral-500">Absent</span>
                                        <span className="text-sm font-bold text-red-600">{totalAbsent}</span>
                                    </div>
                                    <div className="w-px h-6 bg-border mx-1" />
                                    <div className="flex flex-col items-center min-w-[55px]">
                                        <span className="text-[9px] uppercase font-bold text-neutral-500">Attendance</span>
                                        <span className="text-sm font-bold text-blue-600">{percentage.toFixed(1)}%</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogHeader>
                    <div className="overflow-y-auto flex-1 p-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                        ) : records.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">No records for {months.find(m => m.value === month).label} {year}</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-border">
                                        <TableHead className="text-left py-2 px-1 text-xs font-semibold w-10">Sl.No.</TableHead>
                                        <TableHead className="text-left py-2 px-1 text-xs font-semibold">Date</TableHead>
                                        <TableHead className="text-left py-2 px-1 text-xs font-semibold whitespace-nowrap">
                                            {type === "student" ? "Subject / Teacher" : "Subject / Class"}
                                        </TableHead>
                                        <TableHead className="text-center py-2 px-1 text-xs font-semibold">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {records.map((rec, i) => (
                                        <TableRow key={i} className="border-b border-border/50 hover:bg-neutral-50 transition-colors">
                                            <TableCell className="py-2.5 px-1 text-xs text-muted-foreground w-10">{i + 1}</TableCell>
                                            <TableCell className="py-2.5 px-1 text-xs whitespace-nowrap">{formatDate(rec.date)}</TableCell>
                                            <TableCell className="py-2.5 px-1 min-w-[120px]">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs font-medium text-foreground leading-tight">{rec.subjectName}</span>
                                                    <span className="text-[10px] text-muted-foreground leading-tight italic">
                                                        {type === "student" ? (rec.teacherName || "—") : (rec.className || "—")}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5 px-1 text-center">
                                                {rec.present ? (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0 text-[10px] uppercase font-bold tracking-tight">
                                                        Present
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-none px-2 py-0 text-[10px] uppercase font-bold tracking-tight">
                                                        Absent
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

        </>
    );
}

