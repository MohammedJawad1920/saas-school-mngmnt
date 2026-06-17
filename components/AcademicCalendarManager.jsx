"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
    CalendarDays, Plus, Pencil, Trash2, Printer,
    ChevronLeft, ChevronRight, X, Check, Loader, CalendarIcon, AlertCircle,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import PrintHeader from "./PrintHeader";
import { useRef } from "react";
import React from "react";

import useCrud from "@/hooks/use-crud";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// ─── Constants ──────────────────────────────────────────────────────────────
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const EMPTY_FORM = { title: "", date: "", time: "", description: "", type: "Event" };

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtInput = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const fmtDisplay = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtDDMMYYYY = (d) => { if (!d) return ""; const x = new Date(d); return `${String(x.getDate()).padStart(2, "0")}/${String(x.getMonth() + 1).padStart(2, "0")}/${x.getFullYear()}`; };

// ─── Mini Month Calendar ─────────────────────────────────────────────────────
function MonthCalendar({ year, monthIndex, events, onDayClick }) {
    const today = new Date();
    const daysInMon = new Date(year, monthIndex + 1, 0).getDate();
    const firstDay = new Date(year, monthIndex, 1).getDay();

    const eventsByDay = useMemo(() => {
        const map = {};
        events.forEach((ev) => {
            const d = new Date(ev.date);
            if (d.getMonth() === monthIndex && d.getFullYear() === year) {
                const day = d.getDate();
                if (!map[day]) map[day] = [];
                map[day].push(ev);
            }
        });
        return map;
    }, [events, monthIndex, year]);

    const isToday = (day) =>
        today.getDate() === day && today.getMonth() === monthIndex && today.getFullYear() === year;

    return (
        <Card className="border shadow-sm">
            <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm font-semibold text-center">{MONTHS[monthIndex]}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-4">
                <div className="grid grid-cols-7 mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                        <div key={d} className="text-center text-xs font-bold text-muted-foreground">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-y-0.5">
                    {Array(firstDay).fill(null).map((_, i) => <div key={`b${i}`} />)}
                    {Array.from({ length: daysInMon }, (_, i) => i + 1).map((day) => {
                        const evs = eventsByDay[day] || [];
                        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        return (
                            <button key={day} onClick={() => onDayClick(dateStr, evs)}
                                className={cn(
                                    "relative flex flex-col items-center text-base py-3 rounded-md transition-colors hover:bg-accent",
                                    isToday(day) && "bg-primary text-primary-foreground hover:bg-primary/90 font-bold",
                                    evs.length > 0 && !isToday(day) && "font-semibold"
                                )}>
                                <span>{day}</span>
                                {evs.length > 0 && (
                                    <div className="flex gap-px mt-px">
                                        <span className="h-1 w-1 rounded-full bg-primary" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function AcademicCalendarManager({ apiKey }) {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dayDialogOpen, setDayDialogOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedDayEvs, setSelectedDayEvs] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [isDeletingRecord, setIsDeletingRecord] = useState(false);
    const calendarRef = useRef();

    const { useFetchItems, useAddItem, useUpdateItem, useDeleteItem } =
        useCrud("academic-calendar", apiKey);

    const calendarQuery = useFetchItems(0, 0, { year }, {
        staleTime: 0, refetchOnWindowFocus: false,
    });

    const addEvent = useAddItem();
    const updateEvent = useUpdateItem();
    const deleteEvent = useDeleteItem();

    const events = useMemo(
        () => calendarQuery.data?.["academic-calendar"] || [],
        [calendarQuery.data]
    );
    const sortedEvents = useMemo(
        () => [...events].sort((a, b) => new Date(a.date) - new Date(b.date)),
        [events]
    );

    const years = useMemo(() => Array.from({ length: 10 }, (_, i) => currentYear - 3 + i), [currentYear]);

    const openAddDialog = useCallback((preDate = "") => {
        setEditingEvent(null);
        setForm({ ...EMPTY_FORM, date: preDate });
        setDialogOpen(true); setDayDialogOpen(false);
    }, []);

    const openEditDialog = useCallback((ev) => {
        setEditingEvent(ev);
        setForm({ title: ev.title, date: fmtInput(ev.date), time: ev.time || "", description: ev.description || "", type: ev.type || "Event" });
        setDialogOpen(true); setDayDialogOpen(false);
    }, []);

    const handleDayClick = useCallback((dateStr, evs) => {
        setSelectedDay(dateStr); setSelectedDayEvs(evs); setDayDialogOpen(true);
    }, []);

    const handleSubmit = async () => {
        if (!form.title.trim() || !form.date) { toast.error("Title and date are required."); return; }
        setSubmitting(true);
        const payload = { title: form.title.trim(), date: form.date, time: form.time || "", description: form.description || "", type: form.type || "Event" };
        try {
            editingEvent
                ? await updateEvent.mutateAsync({ data: { ids: [editingEvent._id], ...payload } })
                : await addEvent.mutateAsync(payload);
            toast.success(editingEvent ? "Special day updated!" : "Special day added!");
            setDialogOpen(false); setForm(EMPTY_FORM); calendarQuery.refetch();
        } catch (err) { toast.error(err.message || "Something went wrong."); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async (id) => {
        setIsDeletingRecord(true);
        try {
            await deleteEvent.mutateAsync({ data: [id] });
            toast.success("Special day deleted.");
            calendarQuery.refetch();
            setSelectedDayEvs((p) => p.filter((e) => e._id !== id));
            setDeletingId(null);
        } catch (err) { toast.error(err.message || "Delete failed."); }
        finally { setIsDeletingRecord(false); }
    };

    const handlePrint = useReactToPrint({
        contentRef: calendarRef,
        documentTitle: `Academic Calendar - ${year}`,
    });

    return (
        <>
            <div className="space-y-6 no-print">
            {/* Toolbar */}
            <div className="flex flex-row items-center justify-between gap-2 overflow-x-auto pb-2 sm:pb-0 sm:overflow-visible">
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setYear(y => y - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                        <SelectTrigger className="w-[140px] sm:w-[140px] h-8 sm:h-9 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setYear(y => y + 1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Button onClick={handlePrint} className="h-8 sm:h-9 px-2 sm:px-4 gap-1 sm:gap-2 btn-print text-xs sm:text-sm">
                        <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Print
                    </Button>
                    <Button onClick={() => openAddDialog()} className="h-8 sm:h-9 px-2 sm:px-4 gap-1 sm:gap-2 text-xs sm:text-sm">
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span>Add <span className="hidden sm:inline">Special Day</span></span>
                    </Button>
                </div>
            </div>

            {calendarQuery.isLoading ? (
                <div className="flex justify-center items-center h-60">
                    <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Events Side Panel (Top on mobile, Right on desktop) */}
                    <div className="lg:col-span-1 lg:order-last">
                        <Card className="sticky top-4">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4" />
                                    Special Days in {year}
                                    <Badge variant="secondary" className="ml-auto">{sortedEvents.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 max-h-[50vh] lg:max-h-[70vh] overflow-y-auto">
                                {sortedEvents.length === 0 ? (
                                    <p className="text-center text-sm text-muted-foreground p-6">
                                        No special days marked for {year}.
                                    </p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date & Time</TableHead>
                                                <TableHead>Title</TableHead>
                                                <TableHead className="w-16" />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(
                                                sortedEvents.reduce((acc, ev) => {
                                                    const m = new Date(ev.date).getMonth();
                                                    if (!acc[m]) acc[m] = [];
                                                    acc[m].push(ev);
                                                    return acc;
                                                }, {})
                                            ).flatMap(([monthIndex, monthEvents]) => [
                                                <TableRow key={`m-${monthIndex}`} className="bg-muted/50 hover:bg-muted/50">
                                                    <TableCell colSpan={3} className="font-semibold text-center py-1.5 h-auto text-xs">
                                                        {MONTHS[monthIndex]}
                                                    </TableCell>
                                                </TableRow>,
                                                ...monthEvents.map(ev => (
                                                    <TableRow key={ev._id}>
                                                        <TableCell className="text-xs whitespace-nowrap">
                                                            <div>{fmtDisplay(ev.date)}</div>
                                                            <div className="text-muted-foreground mt-0.5">{ev.time || "--"}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <p className="text-xs font-medium">{ev.title}</p>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex gap-1">
                                                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                                                    onClick={() => openEditDialog(ev)}>
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </Button>
                                                                 <Button variant="ghost" size="icon"
                                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                                    onClick={() => setDeletingId(ev._id)}>
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ])}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Calendar Grid (Bottom on mobile, Left on desktop) */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {MONTHS.map((_, idx) => (
                            <MonthCalendar key={idx} year={year} monthIndex={idx}
                                events={events} onDayClick={handleDayClick} />
                        ))}
                    </div>
                </div>
            )}

            {/* Day Detail Dialog */}
            <Dialog open={dayDialogOpen} onOpenChange={setDayDialogOpen}>
                <DialogContent className="max-w-md no-print">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5" />
                            {selectedDay && new Date(selectedDay + "T00:00:00").toLocaleDateString("en-IN", {
                                weekday: "long", day: "numeric", month: "long", year: "numeric"
                            })}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedDayEvs.length === 0 ? "No special day marked." : `${selectedDayEvs.length} special day(s) marked.`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        {selectedDayEvs.map(ev => (
                            <div key={ev._id} className="rounded-lg border p-3 bg-accent/50">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-sm">{ev.title}</p>
                                        <p className="text-[10px] text-muted-foreground">{ev.time || "--"}</p>
                                        {ev.description && <p className="text-xs mt-1 opacity-80">{ev.description}</p>}
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(ev)}>
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon"
                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                            onClick={() => setDeletingId(ev._id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button className="w-full gap-2 mt-2" onClick={() => openAddDialog(selectedDay || "")}>
                        <Plus className="h-4 w-4" /> <span>Add <span className="hidden sm:inline">Special Day</span></span>
                    </Button>
                </DialogContent>
            </Dialog>

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md no-print">
                    <DialogHeader>
                        <DialogTitle>{editingEvent ? "Edit Special Day" : "Add Special Day"}</DialogTitle>
                        <DialogDescription>
                            {editingEvent ? "Update the details of this special day." : "Mark a date as a special day."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
                            <Input placeholder="e.g. Eid Al-Fitr, Semester Exam, College Day"
                                value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Time <span className="text-gray-400 text-xs">(optional)</span></label>
                            <Input placeholder="e.g. 10:00 AM, All Day"
                                value={form.time} onChange={(e) => setForm(p => ({ ...p, time: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Date <span className="text-red-500">*</span></label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !form.date && "text-muted-foreground"
                                    )}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {form.date ? fmtDDMMYYYY(form.date) : "DD/MM/YYYY"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={form.date ? new Date(form.date) : undefined}
                                        onSelect={(d) => setForm(p => ({ ...p, date: d ? fmtInput(d) : "" }))}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                <X className="h-4 w-4 mr-1" />Cancel
                            </Button>
                            <Button onClick={handleSubmit} disabled={submitting}>
                                {submitting ? <Loader className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                                {editingEvent ? "Update" : "Add Special Day"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>

        {/* Printable View - Hidden on Screen */}
        <div ref={calendarRef} className="absolute -top-[9999px] left-0 print:static print:block p-4 sm:p-8 bg-white print:w-full">
                <PrintHeader
                        apiKey={apiKey}
                        title={`ACADEMIC CALENDAR - ${year}`}
                        subTitle="Special Days and Events"
                        displayOnScreen={true}
                    />

                    <div className="mt-6">
                        <table className="w-full border-collapse border border-slate-300 text-sm">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="w-1/4 font-bold border border-slate-300 p-2 text-left">Date</th>
                                    <th className="w-1/5 font-bold border border-slate-300 p-2 text-left">Time</th>
                                    <th className="font-bold border border-slate-300 p-2 text-left">Event Title</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(
                                    sortedEvents.reduce((acc, ev) => {
                                        const m = new Date(ev.date).getMonth();
                                        if (!acc[m]) acc[m] = [];
                                        acc[m].push(ev);
                                        return acc;
                                    }, {})
                                ).map(([monthIndex, monthEvents]) => (
                                    <React.Fragment key={monthIndex}>
                                        <tr className="bg-slate-100">
                                            <td colSpan={3} className="text-center font-bold py-2 border border-slate-300">
                                                {MONTHS[monthIndex]}
                                            </td>
                                        </tr>
                                        {monthEvents.map((ev) => (
                                            <tr key={ev._id} className="border-b">
                                                <td className="border border-slate-300 p-2">{fmtDisplay(ev.date)}</td>
                                                <td className="border border-slate-300 p-2 text-slate-500 italic">
                                                    {ev.time || "--"}
                                                </td>
                                                <td className="border border-slate-300 p-2 font-medium">{ev.title}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            {/* Delete Confirmation Modal */}
            {deletingId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <Card className="w-full max-w-sm shadow-2xl border-destructive/20 overflow-hidden animate-in zoom-in-95 duration-200">
                        <CardHeader className="bg-destructive/5 pb-2">
                            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                                <AlertCircle className="w-5 h-5" />
                                Confirm Deletion
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Are you sure you want to delete this special day? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setDeletingId(null)}
                                    disabled={isDeletingRecord}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={() => handleDelete(deletingId)}
                                    disabled={isDeletingRecord}
                                >
                                    {isDeletingRecord ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
