"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import axios from "axios";
import { Loader, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const AttendanceSheet = ({ apiKey, userId, userRole }) => {
    const [batches, setBatches] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [allSubjects, setAllSubjects] = useState([]);

    const [filters, setFilters] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        batchId: "",
        classId: "",
        subjectId: "",
    });

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState({ students: [], attendanceMap: {}, leavesMap: {} });
    const [daysInMonth, setDaysInMonth] = useState([]);

    const filteredClasses = classes;

    const handleBatchChange = (batchId) => {
        const targetBatchId = batchId === "none" ? "" : batchId;
        setFilters(prev => ({
            ...prev,
            batchId: targetBatchId,
            classId: "",
            subjectId: ""
        }));
    };

    const handleClassChange = (classId) => {
        const targetClassId = classId === "none" ? "" : classId;
        setFilters(prev => ({
            ...prev,
            classId: targetClassId,
            subjectId: ""
        }));
    };

    // helper for headers
    const getHeaders = () => ({
        "api-key": apiKey,
        "x-user-id": userId
    });

    // 1. Fetch Metadata (Batches, Classes & Subjects)
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [classesRes, subjectsRes, batchesRes] = await Promise.all([
                    axios.get("/api/classes", { headers: getHeaders() }),
                    axios.get("/api/subjects", { 
                        headers: getHeaders(),
                        params: { projection: "_id,name" }
                    }),
                    axios.get("/api/batches", { headers: getHeaders() })
                ]);
                setClasses(classesRes.data.classes || []);
                setAllSubjects(subjectsRes.data.subjects || []);
                setBatches(batchesRes.data.batches || []);
            } catch (error) {
                console.error("Metadata fetch error:", error);
                toast.error("Failed to fetch initial data");
            }
        };
        if (apiKey) fetchMetadata();
    }, [apiKey]);

    // 2. Fetch Subjects when Class or Batch changes
    useEffect(() => {
        const fetchSubjects = async () => {
            if (filters.classId) {
                const cls = classes.find(c => c._id === filters.classId);
                
                // Collect current subjects from class data
                const currentSubjects = [
                    ...(cls?.coreSubjects || []), 
                    ...(cls?.majorSubjects || [])
                ].map(s => {
                    if (typeof s === 'string') {
                        const found = allSubjects.find(sub => sub._id === s);
                        return found || { _id: s, name: s };
                    }
                    return s;
                });

                try {
                    // Fetch historical subjects from attendance records
                    const histRes = await axios.get(`/api/classes/historical-subjects?classId=${filters.classId}`, {
                        headers: getHeaders()
                    });
                    const historicalSubjects = histRes.data.subjects || [];

                    // Combine current and historical subjects
                    const combined = [...currentSubjects, ...historicalSubjects];

                    // Remove duplicates based on _id
                    const uniqueSubjects = combined.filter((s, index, self) => 
                        s && s._id && index === self.findIndex((t) => t._id === s._id)
                    );
                    
                    setSubjects(uniqueSubjects);
                } catch (error) {
                    console.error("Error fetching historical subjects:", error);
                    // Fallback to current subjects only if API fails
                    setSubjects(currentSubjects);
                }
                
                setFilters(prev => ({ ...prev, subjectId: "" })); // Reset subject
            } else if (filters.batchId) {
                // Collect subjects from all classes in the batch
                const batchClasses = classes.filter(c => {
                    const bId = c.batchId && typeof c.batchId === 'object' ? c.batchId._id : c.batchId;
                    return bId === filters.batchId;
                });
                
                const collectedSubjects = [];
                batchClasses.forEach(cls => {
                    [...(cls.coreSubjects || []), ...(cls.majorSubjects || [])].forEach(s => {
                        let subjectObj = s;
                        if (typeof s === 'string') {
                            subjectObj = allSubjects.find(sub => sub._id === s) || { _id: s, name: s };
                        }
                        if (subjectObj && subjectObj._id) {
                            collectedSubjects.push(subjectObj);
                        }
                    });
                });

                // Remove duplicates
                const uniqueSubjects = collectedSubjects.filter((s, index, self) => 
                    s && s._id && index === self.findIndex((t) => t._id === s._id)
                );

                setSubjects(uniqueSubjects);
                setFilters(prev => ({ ...prev, subjectId: "" })); // Reset subject
            } else {
                setSubjects([]);
            }
        };

        fetchSubjects();
    }, [filters.classId, filters.batchId, classes, allSubjects]);

    // 3. Calculate Date Headers
    useEffect(() => {
        const date = new Date(filters.year, filters.month, 1);
        const days = [];
        while (date.getMonth() === filters.month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        setDaysInMonth(days);
    }, [filters.month, filters.year]);

    // 4. Fetch Attendance Data
    const loadAttendance = async () => {
        if ((!filters.classId && !filters.batchId) || !filters.subjectId) {
            toast.error("Please select Batch/Class and Subject");
            return;
        }

        setLoading(true);

        try {
            const params = {
                subjectId: filters.subjectId,
                month: filters.month,
                year: filters.year
            };
            if (filters.classId) {
                params.classId = filters.classId;
            }
            if (filters.batchId) {
                params.batchId = filters.batchId;
            }

            const res = await axios.get("/api/attendance-sheet", {
                headers: getHeaders(),
                params
            });
            setData(res.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load attendance records");
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="space-y-6 animate-in fade-in duration-500">
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
                    STUDENTS ATTENDANCES
                </div>
                <div className="flex items-center gap-6 text-sm font-semibold uppercase tracking-wider mt-1 text-black print:text-black">
                    <span>{new Date(0, filters.month).toLocaleString('default', { month: 'long' })} {filters.year}</span>
                    <span>•</span>
                    {filters.batchId && (
                        <>
                            <span>{batches.find(b => b._id === filters.batchId)?.name || 'Batch'}</span>
                            <span>•</span>
                        </>
                    )}
                    {filters.classId && (
                        <>
                            <span>{classes.find(c => c._id === filters.classId)?.name || 'Class'}</span>
                            <span>•</span>
                        </>
                    )}
                    <span>{subjects.find(s => s._id === filters.subjectId)?.name || 'Subject'}</span>
                </div>
            </div>

            {/* Filters - Hidden in Print */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6 print:hidden">
                <Select value={filters.year.toString()} onValueChange={(v) => setFilters(prev => ({ ...prev, year: parseInt(v) }))}>
                    <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                    <SelectContent>
                        {[...Array(5)].map((_, i) => {
                            const y = new Date().getFullYear() - i;
                            return <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        })}
                    </SelectContent>
                </Select>

                <Select value={filters.month.toString()} onValueChange={(v) => setFilters(prev => ({ ...prev, month: parseInt(v) }))}>
                    <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                    <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                                {new Date(0, i).toLocaleString('default', { month: 'long' })}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={filters.batchId || "none"} onValueChange={handleBatchChange}>
                    <SelectTrigger><SelectValue placeholder="Select Batch" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">All/No Batch</SelectItem>
                        {batches.map(b => (
                            <SelectItem key={b._id} value={b._id}>
                                {b.name} {b.academicYear ? `(${b.academicYear})` : ""}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={filters.classId || "none"} onValueChange={handleClassChange}>
                    <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">All/No Class</SelectItem>
                        {filteredClasses.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={filters.subjectId} onValueChange={(v) => setFilters(prev => ({ ...prev, subjectId: v }))} disabled={!filters.classId && !filters.batchId}>
                    <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                    <SelectContent>
                        {subjects.map(s => (
                            <SelectItem key={s._id || `s-${s}`} value={s._id || s}>
                                {s.name || s}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button onClick={loadAttendance} disabled={loading} className="w-full">
                    {loading ? <Loader className="animate-spin" /> : "Load Data"}
                </Button>

                <Button
                    className="bg-black text-white hover:bg-gray-800 w-full"
                    onClick={() => window.print()}
                >
                    Print
                </Button>
            </div>

            {/* Table */}
            <div className="border rounded-md overflow-x-auto print:max-h-none print:overflow-visible">
                <Table>
                    <TableHeader className="sticky top-0 bg-secondary z-20 print:static">
                        <TableRow>
                            <TableHead className="w-[50px] sticky left-0 bg-secondary z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none">Sl.No</TableHead>
                            <TableHead className="min-w-[150px] sticky left-[50px] bg-secondary z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none">Student Name</TableHead>
                            {daysInMonth.map(day => (
                                <TableHead key={day.toISOString()} className={`text-center min-w-[30px] px-1 ${day.getDay() === 5 ? 'bg-red-50 text-red-600 print:bg-red-100' : ''}`}>
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-bold">{day.getDate()}</span>
                                        <span className="text-[9px] uppercase">{day.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.students.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={daysInMonth.length + 2} className="text-center h-24">
                                    {loading ? "Loading..." : "No data to display. specific filters to load."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.students.map((student, index) => (
                                <TableRow key={student._id} className="group print:break-inside-avoid">
                                    <TableCell className="sticky left-0 bg-background group-hover:bg-muted/50 z-30 font-medium text-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell className="sticky left-[50px] bg-background group-hover:bg-muted/50 z-10 font-medium shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:shadow-none">
                                        <div className="flex flex-col">
                                            <span>{student.name}</span>
                                            {filters.batchId && !filters.classId && student.studentSpecificField?.classId && (
                                                <span className="text-[10px] text-muted-foreground font-normal">
                                                    {classes.find(c => c._id === student.studentSpecificField.classId)?.name || ""}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    {daysInMonth.map(day => {
                                        const dateKey = day.getDate();
                                        const entry = data.attendanceMap[student._id]?.[dateKey];
                                        // Determine status: Database
                                        const isPresent = entry?.present;
                                        const isFriday = day.getDay() === 5;

                                        if (isFriday) {
                                            const isMiddle = index === Math.floor(data.students.length / 2);

                                            // VISUAL MERGE: We simulate a merged column by hiding borders between cells.
                                            // This allows the browser to break the table across pages (starting on Page 1),
                                            // which is impossible with a real 'rowSpan' of 50+ rows.
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
                                        // Removed previous return block - handled by replace_file_content scope implicitly?
                                        // Wait, I need to include the return block to match the EndLine correctly or the structure.
                                        // Actually, I can just stop here as the next line is `return (` which I didn't include in ReplacementContent
                                        // BUT I need to make sure I am replacing the VALID range.
                                        // Let's check StartLine 120 to EndLine 266 covers EVERYTHING from styles to tooltips?
                                        // Line 120 is styles.
                                        // Line 266 is inside Tooltip.
                                        // This is a HUGE chunk.
                                        // I should be careful.
                                        // Maybe split it?
                                        // No, a large chunk ensures consistency if I have the content right.
                                        // The content I pasted above ends at `}` of `else if`.
                                        // The original file goes on to `return ( ... <TableCell ...`.
                                        // So I need to verify what I am replacing.
                                        // StartLine 120: <style jsx global>...
                                        // EndLine 244 (in original): ...Icon = <X ... />;
                                        // My ReplacementContent ends with the `if (isPresent ...` block.
                                        // So I should target up to there.

                                        // Let's refined the chunk to be safe.
                                        // Chunk 1: Styles to Filters.
                                        // Chunk 2: Table Loop body (Friday + Visuals).


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
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

        </div>
    );
};

export default AttendanceSheet;
