"use client";

import React, { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import axios from "axios";
import { Loader, Check, X, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const LiteraryAttendanceSheet = ({ apiKey, userId }) => {
    const [classes, setClasses] = useState([]);
    const [groups, setGroups] = useState([]);

    const [filters, setFilters] = useState({
        fromDate: startOfMonth(new Date()),
        toDate: endOfMonth(new Date()),
        category: "", // "ALL", "GROUP", "BOTH"
        categoryId: "", // Selected class._id
    });

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ students: [], attendanceMap: {}, leavesMap: {} });
    const [daysInMonth, setDaysInMonth] = useState([]);


    // helper for headers
    const getHeaders = () => ({
        "api-key": apiKey,
        "x-user-id": userId
    });

    // 1. Fetch Metadata (Classes & Groups)
    useEffect(() => {
        const fetchFiltersData = async () => {
            try {
                const [classRes, groupRes] = await Promise.all([
                    axios.get("/api/classes", { headers: getHeaders() }),
                    axios.get("/api/literary/groups", { headers: getHeaders() })
                ]);
                setClasses(classRes.data.classes || []);
                setGroups(groupRes.data.groups || []);
            } catch (error) {
                toast.error("Failed to fetch classes or groups");
            }
        };
        if (apiKey) fetchFiltersData();
    }, [apiKey]);

    // Reset selected ID when category changes
    useEffect(() => {
        setFilters(prev => ({ ...prev, categoryId: "" }));
        setData({ students: [], attendanceMap: {}, leavesMap: {} });
    }, [filters.category]);

    // 3. Calculate Date Headers (Default to all days initially, filter later)
    useEffect(() => {
        if (!filters.fromDate || !filters.toDate) return;
        const days = [];
        let d = new Date(filters.fromDate);
        const end = new Date(filters.toDate);
        end.setHours(23, 59, 59, 999);
        while (d <= end) {
            days.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }
        setDaysInMonth(days);
    }, [filters.fromDate, filters.toDate]);

    // Track active dates based on the response data
    const [activeDates, setActiveDates] = useState(new Set());

    // 4. Fetch Attendance Data
    const loadAttendance = async () => {
        if (!filters.category || !filters.categoryId) {
            toast.error("Please select a Category and specify the Class.");
            return;
        }

        setLoading(true);

        try {
            const res = await axios.get("/api/literary/attendance-sheet", {
                headers: getHeaders(),
                params: {
                    category: filters.category,
                    categoryId: filters.categoryId,
                    startDate: format(filters.fromDate, "yyyy-MM-dd"),
                    endDate: format(filters.toDate, "yyyy-MM-dd")
                }
            });
            setData(res.data);

            // Determine which days have attendance data
            const activeDbDates = new Set();
            Object.values(res.data.attendanceMap || {}).forEach(studentData => {
                Object.keys(studentData).forEach(dateStr => activeDbDates.add(dateStr));
            });
            setActiveDates(activeDbDates);

        } catch (error) {
            console.error(error);
            toast.error("Failed to load attendance records");
        } finally {
            setLoading(false);
        }
    };

    const getFilterLabel = () => {
        if (!filters.category) return "Category / Class";

        let prefix = "General";
        if (filters.category === "BOTH") prefix = "Both";
        if (filters.category === "GROUP") prefix = "Group";

        const cls = classes.find(c => c._id === filters.categoryId);
        return cls ? `${prefix} - ${cls.name}` : `${prefix} - Class`;
    }

    return (
        <div className="space-y-2 animate-in fade-in duration-500">
            {/* Styles for Print */}
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: landscape; }
                    body { -webkit-print-color-adjust: exact; margin: 0; padding: 0 !important; overflow: visible !important; }
                    html { margin: 0; padding: 0; overflow: visible !important; }
                    
                    /* Hide App Layout Elements */
                    nav, aside, header, .header, .sidebar, .top-bar, .app-sidebar, [data-sidebar="sidebar"] { display: none !important; }
                    .print\:hidden { display: none !important; }

                    /* Reset Layout Containers for Full Print */
                    div, main { overflow: visible !important; height: auto !important; }
                    
                    /* Pagination Control */
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    tfoot { display: table-footer-group; }
                }
            `}</style>
            {/* Print-only Header */}
            <div className="hidden print:flex flex-col items-center mb-2 -mt-8 text-black print:text-black">
                <div className="tracking-[0.2em] font-bold text-2xl uppercase leading-tight">
                    LITERARY ATTENDANCES
                </div>
                <div className="flex items-center gap-6 text-sm font-semibold uppercase tracking-wider mt-1 text-black print:text-black">
                    <span>
                        {filters.fromDate ? format(filters.fromDate, 'dd MMM yyyy') : ''}
                        {filters.fromDate && filters.toDate ? ' - ' : ''}
                        {filters.toDate ? format(filters.toDate, 'dd MMM yyyy') : ''}
                    </span>
                    <span>•</span>
                    <span>{getFilterLabel()}</span>
                </div>
            </div>

            {/* Filters - Hidden in Print */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 print:hidden">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">From</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal bg-background",
                                    !filters.fromDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.fromDate ? format(filters.fromDate, "dd MMM yyyy") : <span>Select Date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={filters.fromDate}
                                onSelect={(v) => setFilters(prev => ({ ...prev, fromDate: v }))}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">To</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal bg-background",
                                    !filters.toDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.toDate ? format(filters.toDate, "dd MMM yyyy") : <span>Select Date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={filters.toDate}
                                onSelect={(v) => setFilters(prev => ({ ...prev, toDate: v }))}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Category</label>
                    <Select value={filters.category} onValueChange={(v) => setFilters(prev => ({ ...prev, category: v }))}>
                        <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">General</SelectItem>
                            <SelectItem value="GROUP">Group</SelectItem>
                            <SelectItem value="BOTH">Both</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Class</label>
                    <Select value={filters.categoryId} onValueChange={(v) => setFilters(prev => ({ ...prev, categoryId: v }))} disabled={!filters.category}>
                        <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                        <SelectContent>
                            {classes.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="pt-5">
                    <Button onClick={loadAttendance} disabled={loading} className="w-full">
                        {loading ? <Loader className="animate-spin" /> : "Load Data"}
                    </Button>
                </div>

                <div className="pt-5">
                    <Button
                        className="bg-black text-white hover:bg-gray-800 w-full"
                        onClick={() => window.print()}
                    >
                        Print
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-md overflow-x-auto print:max-h-none print:overflow-visible">
                <Table>
                    <TableHeader className="sticky top-0 bg-secondary z-20 print:static">
                        <TableRow>
                            <TableHead className="w-[50px] sticky left-0 bg-secondary z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none">Sl.No</TableHead>
                            <TableHead className="w-auto whitespace-nowrap sticky left-[50px] px-4 bg-secondary z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none">Student Name</TableHead>
                            {daysInMonth.filter(d => activeDates.has(format(d, "yyyy-MM-dd"))).map(day => (
                                <TableHead key={day} className={`text-center min-w-[30px] px-1 ${day.getDay() === 5 ? 'bg-red-50 text-red-600 print:bg-red-100' : ''}`}>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-bold">{day.getDate()}</span>
                                        <span className="text-[9px] uppercase">{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                                    </div>
                                </TableHead>
                            ))}
                            {/* Empty flexible column to push active dates to left */}
                            <TableHead className="w-full"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.students.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={daysInMonth.length + 2} className="text-center h-24">
                                    {loading ? "Loading..." : "No data to display. Please select specific filters to load."}
                                </TableCell>
                            </TableRow>
                        ) : activeDates.size === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                    No attendance has been marked for the selected filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.students.map((student, index) => (
                                <TableRow key={student._id} className="group print:break-inside-avoid">
                                    <TableCell className="sticky left-0 bg-background group-hover:bg-muted/50 z-30 font-medium text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell className="sticky left-[50px] px-4 whitespace-nowrap bg-background group-hover:bg-muted/50 z-10 font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none">
                                        {student.name}
                                    </TableCell>
                                    {daysInMonth.filter(d => activeDates.has(format(d, "yyyy-MM-dd"))).map(day => {
                                        const dateKey = format(day, "yyyy-MM-dd");
                                        const entry = data.attendanceMap[student._id]?.[dateKey];
                                        // Determine status: Database
                                        const isPresent = entry?.present;
                                        const isFriday = day.getDay() === 5;

                                        if (isFriday) {
                                            const isMiddle = index === Math.floor(data.students.length / 2);

                                            const borderTop = index === 0 ? '' : 'border-t-0 print:border-t-0';
                                            const borderBottom = index === data.students.length - 1 ? '' : 'border-b-0 print:border-b-0';

                                            return (
                                                <TableCell
                                                    key={day.toISOString()}
                                                    className={`text-center p-0 border-l bg-red-50/50 print:bg-red-50 align-middle ${borderTop} ${borderBottom}`}
                                                >
                                                    <div className="flex items-center justify-center w-full h-12 relative overflow-visible">
                                                        {isMiddle && (
                                                            <span className="absolute z-0 text-xl text-red-300 font-bold tracking-[1em] uppercase [writing-mode:vertical-lr] py-4 whitespace-nowrap">
                                                                Friday
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            );
                                        }

                                        // Visuals
                                        let Icon = null;
                                        const leaveReason = data.leavesMap?.[student._id]?.[dateKey];

                                        if (isPresent === true) {
                                            Icon = <Check className="w-4 h-4 text-green-600 font-bold" />;
                                        } else if (isPresent === false) {
                                            Icon = (
                                                <div className="flex flex-col items-center">
                                                    <X className="w-3 h-3 text-red-600" />
                                                    {leaveReason && (
                                                        <span className="text-[7px] text-red-500 leading-none mt-0.5 line-clamp-1 max-w-[40px]">
                                                            {leaveReason}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return (
                                            <TableCell
                                                key={day.toISOString()}
                                                className={`text-center p-0.5 border-l`}
                                            >
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center justify-center h-6 w-full cursor-default">
                                                                {Icon ? Icon : <span className="text-gray-200">-</span>}
                                                            </div>
                                                        </TooltipTrigger>
                                                        {entry && (
                                                            <TooltipContent>
                                                                <p className="text-xs">Marked By: {entry.markedBy}</p>
                                                                <p className="text-[10px] text-muted-foreground">{new Date(entry.markedAt).toLocaleString()}</p>
                                                                {data.leavesMap?.[student._id]?.[dateKey] && (
                                                                    <p className="text-[10px] text-yellow-600 font-semibold mt-1">
                                                                        Leave: {data.leavesMap[student._id][dateKey]}
                                                                    </p>
                                                                )}
                                                            </TooltipContent>
                                                        )}
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                        );
                                    })}
                                    {/* Empty flexible column to push active dates to left */}
                                    <TableCell className="w-full"></TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

        </div>
    );
};

export default LiteraryAttendanceSheet;
