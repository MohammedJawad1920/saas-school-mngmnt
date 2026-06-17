'use client';

import { useState, useEffect } from 'react';
import { Check, X, AlertCircle, MinusCircle, Printer, FileText } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sortClasses } from '@/lib/utils';

export default function AttendanceTableReport({ classes }) {
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [tableData, setTableData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isBlankPrint, setIsBlankPrint] = useState(false);

    const handlePrint = () => {
        setIsBlankPrint(false);
        setTimeout(() => {
            window.print();
        }, 100);
    };

    const handlePrintSheet = () => {
        setIsBlankPrint(true);
        setTimeout(() => {
            window.print();
            setIsBlankPrint(false);
        }, 100);
    };

    useEffect(() => {
        if (selectedClass) {
            fetchAttendanceTable();
        } else {
            setTableData([]);
            setColumns([]);
        }
    }, [selectedClass, selectedMonth, selectedYear]);

    const fetchAttendanceTable = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/attendance-table?classId=${selectedClass}&month=${selectedMonth}&year=${selectedYear}`
            );
            const data = await response.json();
            setTableData(data.tableData || []);
            setColumns(data.columns || []);
        } catch (error) {
            console.error('Error fetching attendance table:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderCellContent = (cellData) => {
        if (isBlankPrint && cellData?.status !== 'NO_PERIOD') return null;
        if (!cellData || typeof cellData !== 'object') return '-';

        switch (cellData.status) {
            case 'MARKED':
                return (
                    <div className="flex items-center justify-center text-blue-600 bg-blue-50 p-1 rounded-full w-6 h-6">
                        <Check className="h-3 w-3" />
                    </div>
                );

            case 'NOT_MARKED':
                return (
                    <div className="flex items-center justify-center text-red-600 bg-red-50 p-1 rounded-full w-6 h-6">
                        <X className="h-3 w-3" />
                    </div>
                );

            case 'LEAVE':
                return (
                    <div className="flex flex-col items-center justify-center text-orange-600 px-1" title={cellData.leaveReason}>
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-[8px] font-medium leading-none mt-0.5 whitespace-nowrap">{cellData.leaveReason}</span>
                    </div>
                );

            case 'NO_PERIOD':
                return (
                    <div className="flex items-center justify-center text-gray-300 p-0">
                        <MinusCircle className="h-3 w-3" />
                    </div>
                );

            case 'UPCOMING_PERIOD':
                return null;

            default:
                return '-';
        }
    };

    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' },
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    return (
        <div>
            <style jsx global>{`
                @media print {
                    @page { size: landscape; margin: 5mm; margin-top: 0 !important; }
                    
                    /* Universal Print Reset */
                    html, body { 
                        background: white !important; 
                        color: black !important; 
                        overflow: visible !important; 
                        height: auto !important; 
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    /* Deep Reset to prevent clipping */
                    div, main, section { 
                        overflow: visible !important; 
                        max-height: none !important; 
                        position: static !important; 
                        background: none !important;
                        box-shadow: none !important;
                        backdrop-filter: none !important;
                        padding-top: 0 !important;
                        margin-top: 0 !important;
                    }

                    /* Hide Non-Print Elements */
                    nav, aside, header, footer, .filters-container, [data-sidebar="sidebar"], .no-print, .print\:hidden { 
                        display: none !important; 
                    }
                    
                    /* Table Infrastructure */
                    table { 
                        border-collapse: collapse !important; 
                        width: 100% !important; 
                        border: 1px solid #000 !important; 
                        table-layout: auto !important; 
                        margin: 0 !important;
                    }
                    
                    th, td { 
                        border: 1px solid #000 !important; 
                        background: white !important; 
                        padding: 4px !important; 
                        position: static !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        color: black !important;
                        height: auto !important;
                    }
                    
                    /* Specifically ensure first column is visible */
                    th:first-child, 
                    td:first-child,
                    .date-column {
                        min-width: 95px !important;
                        width: auto !important;
                        display: table-cell !important;
                        white-space: nowrap !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        color: black !important;
                        position: static !important;
                        background: white !important;
                        border: 1px solid #000 !important;
                        text-align: center !important;
                    }

                    th:first-child *, 
                    td:first-child * {
                        display: inline-block !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        color: black !important;
                        text-align: center !important;
                        width: auto !important;
                    }

                    .sticky { position: static !important; }
                    .friday-row td { background-color: #fee2e2 !important; }
                    .no-period-cell { background-color: #f3f4f6 !important; }
                    * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                }
            `}</style>

            {/* Print Header */}
            <div className="hidden print:block text-center mb-0">
                <h1 className="text-2xl font-bold uppercase tracking-widest">Attendance Report</h1>
                <div className="flex justify-center gap-4 mt-2 text-sm font-medium">
                    <span>Class: {classes.find(c => (c.id || c._id) === selectedClass)?.name}</span>
                    <span>Month: {months.find(m => m.value === selectedMonth)?.label}</span>
                    <span>Year: {selectedYear}</span>
                </div>
            </div>

            {/* Filters and Controls */}
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4 print:hidden">
                {/* Row 1 for Mobile: Year, Month, Print */}
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="flex-[0.8] md:w-28">
                        <label className="text-[10px] font-medium mb-1 block md:hidden">Year</label>
                        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((y) => (
                                    <SelectItem key={y} value={y.toString()}>
                                        {y}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-[1.2] md:w-36">
                        <label className="text-[10px] font-medium mb-1 block md:hidden">Month</label>
                        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((m) => (
                                    <SelectItem key={m.value} value={m.value.toString()}>
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 md:hidden">
                        <label className="text-[10px] font-medium mb-1 block">Actions</label>
                        <Button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 bg-black text-white px-2 h-10">
                            <Printer className="h-4 w-4" /> Print
                        </Button>
                    </div>
                </div>

                {/* Row 2 for Mobile: Class, Print Sheet */}
                <div className="flex gap-2 w-full md:w-auto md:flex-1">
                    <div className="flex-[1.5] md:min-w-[200px] md:max-w-xs">
                        <label className="text-[10px] font-medium mb-1 block md:hidden">Select Class</label>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Class" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes?.filter(cls => cls.status === "Active").sort((a, b) => (a._id || a.id).localeCompare(b._id || b.id)).map((cls) => (
                                    <SelectItem key={cls.id || cls._id} value={cls.id || cls._id}>
                                        {cls.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 md:hidden">
                        <label className="text-[10px] font-medium mb-1 block invisible">Actions</label>
                        <Button onClick={handlePrintSheet} className="w-full flex items-center justify-center gap-2 bg-black text-white px-2 h-10">
                            <FileText className="h-4 w-4" /> Sheet
                        </Button>
                    </div>
                </div>

                {/* Desktop-only Buttons */}
                <div className="hidden md:flex gap-2 ml-auto">
                    <Button onClick={handlePrint} className="flex items-center gap-2 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                        <Printer className="h-4 w-4" /> Print
                    </Button>
                    <Button onClick={handlePrintSheet} className="flex items-center gap-2 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90">
                        <FileText className="h-4 w-4" /> Print Sheet
                    </Button>
                </div>
            </div>


            {/* Table */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 border rounded-lg bg-muted/5 mt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p className="text-muted-foreground animate-pulse">Fetching attendance data...</p>
                </div>
            ) : tableData.length > 0 ? (
                <div className="w-full print:max-w-none border rounded-lg shadow-sm print:overflow-visible print:border-none print:shadow-none bg-background print:w-full mt-4 print:mt-0">
                    <div className="overflow-auto max-h-[700px] print:overflow-visible print:max-h-none">
                        <Table className="w-full print:w-full border-separate border-spacing-0">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    {columns.map((col, idx) => (
                                        <TableHead
                                            key={idx}
                                            className={`h-16 bg-[#f8fafc] font-bold border text-center ${idx === 0 ? 'sticky left-0 z-[100] bg-[#f8fafc] date-column whitespace-nowrap px-4' : 'z-[90]'
                                                } sticky top-0 p-0 print:static print:z-0 print:bg-white print:text-black`}
                                        >
                                            {idx === 0 ? (
                                                <div className="text-[11px] font-bold p-0 min-w-max px-2 text-black text-center print:text-xs print:uppercase">{col.Header}</div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center leading-tight w-full h-full px-2 min-w-[80px]">
                                                    <div className="text-[10px] uppercase whitespace-nowrap" title={col.subjectName}>
                                                        {col.subjectName}
                                                    </div>
                                                    <div className="text-[9px] font-normal text-muted-foreground whitespace-nowrap" title={col.teacherName}>
                                                        {(() => {
                                                            const parts = col.teacherName?.split(' ') || [];
                                                            if (parts.length >= 2) {
                                                                const mid = Math.ceil(parts.length / 2);
                                                                return (
                                                                    <div className="flex flex-col items-center">
                                                                        <div className="whitespace-nowrap">{parts.slice(0, mid).join(' ')}</div>
                                                                        <div className="whitespace-nowrap">{parts.slice(mid).join(' ')}</div>
                                                                    </div>
                                                                );
                                                            }
                                                            return <div className="whitespace-nowrap">{col.teacherName}</div>;
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tableData.map((row, rowIdx) => (
                                    <TableRow key={rowIdx} className={`group hover:bg-muted/5 transition-colors ${row.dayName === 'Friday' ? 'bg-red-100/60 dark:bg-red-900/20 print:bg-[#fee2e2] friday-row' : ''}`}>
                                        <TableCell className={`sticky left-0 ${row.dayName === 'Friday' ? 'bg-[#fee2e2]' : 'bg-white'} font-bold border z-30 p-0 h-10 date-column print:static print:bg-white print:text-black print:z-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:shadow-none`}>
                                            <div className="flex items-center justify-center h-full px-4 text-xs whitespace-nowrap text-black print:text-center print:w-full">
                                                {row.displayDate}
                                            </div>
                                        </TableCell>
                                        {columns.slice(1).map((col, colIdx) => (
                                            <TableCell key={colIdx} className={`p-0 border h-10 overflow-hidden ${row[col.accessor]?.status === 'NO_PERIOD' ? 'bg-gray-50/50 no-period-cell' : ''}`}>
                                                <div className="flex items-center justify-center px-2 h-full min-w-[80px]">
                                                    {renderCellContent(row[col.accessor])}
                                                </div>
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            ) : (
                <div className="text-center p-20 border-2 border-dashed rounded-xl bg-muted/5">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                        <AlertCircle className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No Data to Display</h3>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                        {selectedClass ? 'No attendance records found for the selected period.' : 'Please select a class to view the attendance report.'}
                    </p>
                </div>
            )
            }
        </div >
    );
}
