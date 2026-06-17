"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Loader, CheckCircle2, FileText, AlertCircle, Check, ChevronsUpDown, CalendarDays, ChevronRight } from "lucide-react";

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Hooks and Utils
import { formatDate, formatDateForDisplay, cn } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";
import Header from "./Header";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const leaveReasons = [
  "Home Leave",
  "In a Function",
  "Unfitness",
  "Study Leave",
  "Duty Leave",
  "Campus Function",
  "Fiqh Council",
  "Exam",
  "Hospital",
];

const MyPeriods = ({ apiKey, teacherId }) => {
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [classId, setClassId] = useState("");
  const [periodNumber, setPeriodNumber] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState("");
  const [error, setError] = useState(false);
  const [whatsappLoadingId, setWhatsappLoadingId] = useState(null);
  const [whatsappModalData, setWhatsappModalData] = useState(null);

  const router = useRouter();

  const handleNavigation = (slot) => {
    router.push(
      `/dashboard/attendances?classId=${slot.classId?._id}&batchId=${slot.classId.batchId}&subjectId=${slot.subjectId?._id}&periodNumber=${slot.periodNumber}&day=${slot.day}`
    );
  };
  // Use refs or state instead of deriving too many values
  const days = useMemo(
    () => [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    []
  );
  const today = useMemo(() => days[new Date().getDay()], [days]);
  const date = useMemo(() => formatDateForDisplay(new Date()), []);
  const formattedDate = useMemo(() => formatDate(new Date()), []);

  const { useFetchItems } = useCrud("timeTables", apiKey);
  const { useFetchItems: useFetchPeriods } = useCrud("periods", apiKey);
  const { useFetchItems: useFetchAttendance } = useCrud("attendances", apiKey);
  const { useFetchItems: useFetchSettings } = useCrud("settings", apiKey);
  const {
    useFetchItems: useFetchTeachersLeaveRecord,
    useAddItem,
    useUpdateItem,
    useDeleteItem,
  } = useCrud("teachers-leave-record", apiKey);

  const addLeaveRecord = useAddItem();
  const updateLeaveRecord = useUpdateItem();
  const deleteLeaveRecord = useDeleteItem();

  // Reduce network requests by passing proper options
  const periodsQuery = useFetchPeriods(
    0,
    0,
    {},
    {
      staleTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
    }
  );

  const timeTablesQuery = useFetchItems(
    0,
    100, // Reasonable limit
    { teacherId, day: today, projection: "classId,timeSlots" },
    {
      staleTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
    }
  );

  const attendanceQuery = useFetchAttendance(
    0,
    0,
    {
      date: formattedDate,
      teacherId,
    },
    {
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
    }
  );

  const settingsQuery = useFetchSettings(
    0,
    0,
    {},
    {
      staleTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
    }
  );
  const settings = settingsQuery.data?.settings;
  const { useFetchItems: useFetchCalendarEvents } = useCrud("academic-calendar", apiKey);

  const currentYear = new Date().getFullYear();
  const calendarEventsQuery = useFetchCalendarEvents(
    0, 0,
    { year: currentYear },
    { staleTime: 1000 * 60 * 30, refetchOnWindowFocus: false }
  );

  const upcomingEvent = useMemo(() => {
    const events = calendarEventsQuery.data?.["academic-calendar"];
    if (!events || events.length === 0) return null;

    const now = new Date();

    const parseEndTime = (ev) => {
      const d = new Date(ev.date);
      if (isNaN(d.getTime())) return new Date(0);

      const timeStr = ev.time || "";
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const mins = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && hours < 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hours, mins, 0);
      }
      // If no valid time match, event is over at the end of the day
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    };

    const validEvents = events
      .map(ev => ({ ...ev, endTime: parseEndTime(ev) }))
      .filter(ev => ev.endTime > now)
      .sort((a, b) => a.endTime - b.endTime);

    return validEvents.length > 0 ? validEvents[0] : null;
  }, [calendarEventsQuery.data]);

  const dateISO = useMemo(() => new Date().toISOString(), []);

  const leaveRecordQuery = useFetchTeachersLeaveRecord(
    0,
    0,
    {
      teacherId,
      date: formattedDate,
    },
    {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    }
  );

  const leaveRecords = useMemo(() => {
    return leaveRecordQuery.data?.teachersLeaveRecord || [];
  }, [leaveRecordQuery.data?.teachersLeaveRecord]);

  // Memoize periods to avoid unnecessary re-renders
  const periods = useMemo(() => {
    if (!periodsQuery.data?.periods) return [];
    return [...periodsQuery.data.periods].sort(
      (a, b) => a.periodNumber - b.periodNumber
    );
  }, [periodsQuery.data?.periods]);

  // Memoize and process timetable data more efficiently
  const filteredSlots = useMemo(() => {
    if (!timeTablesQuery.data?.timeTables || !periods.length) return [];

    // Process all timeTables in one pass
    const teachersSlots = timeTablesQuery.data.timeTables.flatMap(
      (timeTable) => {
        return timeTable.timeSlots
          .filter(
            (slot) => slot.teacherId?._id === teacherId && slot.day === today && !slot.validTo
          )
          .map((slot) => ({
            ...slot,
            classId: timeTable.classId,
            periodDetails: periods.find(
              (p) => p.periodNumber === slot.periodNumber
            ),
          }));
      }
    );

    return teachersSlots.sort((a, b) => a.periodNumber - b.periodNumber);
  }, [timeTablesQuery.data?.timeTables, periods, teacherId, today]);

  // Precompute attendance status once
  const attendanceStatus = useMemo(() => {
    if (!attendanceQuery.data?.attendances) return {};

    const statusMap = {};
    attendanceQuery.data.attendances.forEach((attendance) => {
      const key = `${attendance.classId?._id}:${attendance.subjectId?._id}:${attendance.periodNumber}`;
      statusMap[key] = attendance;
    });

    return statusMap;
  }, [attendanceQuery.data?.attendances]);

  // Set loading state only when needed
  useEffect(() => {
    if (
      periodsQuery.isLoading ||
      timeTablesQuery.isLoading ||
      attendanceQuery.isLoading ||
      settingsQuery.isLoading ||
      leaveRecordQuery.isLoading
    ) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [
    periodsQuery.isLoading,
    timeTablesQuery.isLoading,
    attendanceQuery.isLoading,
    settingsQuery.isLoading,
    leaveRecordQuery.isLoading,
  ]);

  // Memoize attendance check function
  const isAttendanceMarked = useCallback(
    (slot) => {
      if (!slot) return false;
      const key = `${slot.classId?._id}:${slot.subjectId?._id}:${slot.periodNumber}`;
      return !!attendanceStatus[key];
    },
    [attendanceStatus]
  );

  const handleLeave = async () => {
    if (reason.trim() !== "" && reason.length > 20) {
      toast.error("Leave reason should not exceed 20 characters.");
      return;
    }

    try {
      await addLeaveRecord.mutateAsync({
        teacherId,
        classId,
        periodNumber,
        date: new Date(),
        leaveReason: reason,
      });
      toast.success("Leave reason submitted successfully.");
      setOpen(false);
      setReason("");
      setSelectedRecordId("");
      await leaveRecordQuery.refetch();
      router.refresh();
    } catch (error) {
      console.error("Error submitting leave reason:", error);
      toast.error(error.message || "Error submitting leave reason");
    }
  };

  const handleClear = async () => {
    if (!selectedRecordId) return;

    try {
      await deleteLeaveRecord.mutateAsync({ data: { _id: selectedRecordId } });
      toast.success("Leave reason cleared successfully.");
      setOpen(false);
      setReason("");
      setSelectedRecordId("");
      await leaveRecordQuery.refetch();
      router.refresh();
    } catch (error) {
      console.error("Error clearing leave reason:", error);
      toast.error(error.message || "Error clearing leave reason");
    }
  };

  const handleWhatsAppClick = async (e, slot) => {
    e.stopPropagation();
    
    const key = `${slot.classId?._id}:${slot.subjectId?._id}:${slot.periodNumber}`;
    const attendanceRecord = attendanceStatus[key];
    
    if (!attendanceRecord || typeof attendanceRecord !== "object") {
      toast.error("Attendance not found or not marked yet.");
      return;
    }
    
    const subjectName = slot.subjectId?.name || "this subject";
    
    // Use pre-fetched attendanceData from attendanceQuery
    const absentStudents = attendanceRecord.attendanceData?.filter(student => !student.present) || [];
    
    if (absentStudents.length === 0) {
      toast.info("No absent students for this period.");
      return;
    }
    
    const studentsToMessage = [];
    absentStudents.forEach(student => {
      const number = student.guardianContactNumber || student.contactNumber;
      if (number) {
        const formattedNumber = number.replace(/\D/g, '');
        if (!studentsToMessage.some(s => s.contactNumber === formattedNumber)) {
          studentsToMessage.push({
            name: student.studentName || "Student",
            contactNumber: formattedNumber
          });
        }
      }
    });
    
    if (studentsToMessage.length === 0) {
      toast.error("No contact numbers found for absent students.");
      return;
    }
    
    // Open modal instantly
    setWhatsappModalData({
      subjectName,
      loading: false,
      students: studentsToMessage
    });
  };

  return (
    <div className="space-y-6">
      <div className="w-full">
        <div>
          <Header
            title="MY PERIODS"
            subTitle="View Schedule & Take Attendance"
          />
        </div>
        <div>
          {/* Day selector */}
          <div className="mb-2 py-1 px-8 border border-border rounded-lg max-w-fit text-sm">
            {date}
          </div>

          {/* ── Upcoming Special Day Banner ── */}
          {upcomingEvent && (
            <button
              type="button"
              onClick={() => setCalendarOpen(true)}
              className="mb-4 w-full overflow-hidden rounded-lg border hover:opacity-90 transition-opacity text-left cursor-pointer"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-l-4 border-yellow-400 bg-yellow-50 text-yellow-900 font-medium">
                <CalendarDays className="h-5 w-5 shrink-0 text-yellow-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center bg-yellow-200/60 text-yellow-800 rounded-md px-3 py-1.5 text-xs font-bold leading-tight whitespace-nowrap">
                      <span>{new Date(upcomingEvent.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      {upcomingEvent.time && <span className="mt-0.5">{upcomingEvent.time}</span>}
                    </div>
                    <span className="text-sm font-semibold">{upcomingEvent.title}</span>
                  </div>
                  {upcomingEvent.description && (
                    <p className="text-xs opacity-80 mt-0.5">{upcomingEvent.description}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-yellow-600 shrink-0" />
              </div>
            </button>
          )}
          {/* ─────────────────────────────────────────── */}

          {/* Periods Table */}
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredSlots.length > 0 && settings?.general?.isWorkingDay ? (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 hidden md:table-cell">
                      Period
                    </TableHead>
                    <TableHead className="w-32 whitespace-nowrap">Time</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Subject
                    </TableHead>
                    <TableHead className="text-center"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSlots.map((slot) => {
                    const leaveRecord = leaveRecords.find(
                      (record) =>
                        String(record.classId?._id || record.classId) === String(slot.classId?._id) &&
                        record.periodNumber === slot.periodNumber &&
                        formatDate(new Date(record.date)) === formattedDate
                    );
                    return (
                      <TableRow
                        key={slot._id}
                        className="hover:bg-accent/50"
                        onClick={() => {
                          handleNavigation(slot);
                        }}
                      >
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center justify-center font-medium">
                            <Badge variant="outline">{slot.periodNumber}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap w-32">
                          <div className="flex items-center gap-2">
                            {slot.periodDetails?.formattedTime ||
                              `Period ${slot.periodNumber}`}
                          </div>
                          {isAttendanceMarked(slot) && (
                            <div className="flex items-center gap-1 text-xxs text-muted-foreground">
                              <CheckCircle2 className="text-green-500 h-3 w-3" />
                              <span>Attendance Marked</span>
                            </div>
                          )}
                          {leaveRecord && !isAttendanceMarked(slot) && (
                            <div className="flex items-center gap-1 text-xxs text-muted-foreground">
                              <AlertCircle className="text-red-500 h-3 w-3" />
                              <span>{leaveRecord.leaveReason}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-xs md:text-base">
                            {slot.classId?.name}
                          </div>
                          <div className="text-xs md:hidden mt-1 text-muted-foreground">
                            {slot.subjectId?.name}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {slot.subjectId?.name}
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          {isAttendanceMarked(slot) ? (
                            <button
                              onClick={(e) => handleWhatsAppClick(e, slot)}
                              className="text-green-500 hover:text-green-600 transition-colors p-2 md:px-3 md:py-1.5 rounded-full md:rounded-md hover:bg-green-50 inline-flex items-center justify-center gap-1.5"
                              title="Message Absent Students"
                            >
                              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                              <span className="hidden md:inline font-medium text-sm">Message</span>
                            </button>
                          ) : (
                            <div
                              className="z-10 flex justify-center items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpen(true);
                                setClassId(slot.classId._id);
                                setPeriodNumber(slot.periodNumber);
                                setReason(leaveRecord?.leaveReason || "");
                                setSelectedRecordId(leaveRecord?._id || "");
                              }}
                            >
                              <FileText className="text-muted-foreground h-5 w-5 md:hidden" />
                              <Button size="sm" className="hidden md:inline-flex">
                                Reason
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-8 border rounded-md font-bold text-muted-foreground text-lg">
              {!settings?.general?.isWorkingDay
                ? settings?.general?.occasion || "Today is a non-working day."
                : "No periods scheduled for " + today + "."}
            </div>
          )}
        </div>
        {/* ── Academic Calendar Events Popup ── */}
        <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-yellow-600" />
                Academic Calendar — {currentYear}
              </DialogTitle>
              <DialogDescription>
                Special days and events for the current year.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh] -mx-6 px-6">
              {calendarEventsQuery.isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (() => {
                const allEvents = calendarEventsQuery.data?.["academic-calendar"] || [];
                const sorted = [...allEvents].sort((a, b) => new Date(a.date) - new Date(b.date));
                if (sorted.length === 0) {
                  return (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No special days marked for {currentYear}.
                    </p>
                  );
                }
                const grouped = sorted.reduce((acc, ev) => {
                  const m = new Date(ev.date).getMonth();
                  if (!acc[m]) acc[m] = [];
                  acc[m].push(ev);
                  return acc;
                }, {});
                const MONTHS_LIST = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date &amp; Time</TableHead>
                        <TableHead className="text-xs">Event</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(grouped).flatMap(([monthIdx, evs]) => [
                        <TableRow key={`m-${monthIdx}`} className="bg-muted/50 hover:bg-muted/50">
                          <TableCell colSpan={2} className="font-semibold py-1.5 h-auto text-xs text-center">
                            {MONTHS_LIST[parseInt(monthIdx)]}
                          </TableCell>
                        </TableRow>,
                        ...evs.map(ev => (
                          <TableRow key={ev._id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              <div>{new Date(ev.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                              {ev.time && <div className="text-muted-foreground mt-0.5">{ev.time}</div>}
                            </TableCell>
                            <TableCell>
                              <p className="text-xs font-medium">{ev.title}</p>
                              {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                            </TableCell>
                          </TableRow>
                        ))
                      ])}
                    </TableBody>
                  </Table>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[90%] sm:w-full sm:max-w-md rounded-xl">
            <DialogTitle>Leave Reason</DialogTitle>
            <DialogDescription>Provide a leave reason.</DialogDescription>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
              <div className="relative">
                <Input
                  placeholder="Select or type a reason..."
                  value={reason}
                  onChange={(e) => {
                    if (e.target.value.length > 20) {
                      setError(true);
                    }
                    setReason(e.target.value);
                  }}
                  className="pl-10 pr-10"
                />
                <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    >
                      <ChevronsUpDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="end">
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {leaveReasons.map((r) => (
                            <CommandItem
                              key={r}
                              value={r}
                              onSelect={(currentValue) => {
                                setReason(currentValue);
                                setComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  reason === r ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {r}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>{" "}
              {error && (
                <p className="text-destructive text-xs p-1">
                  Leave reason should not exceed 20 characters.
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {selectedRecordId && (
                <Button 
                  variant="outline" 
                  className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-white"
                  disabled={deleteLeaveRecord.isPending} 
                  onClick={handleClear}
                >
                  Clear
                </Button>
              )}
              <Button 
                disabled={addLeaveRecord.isPending} 
                onClick={handleLeave}
                className={selectedRecordId ? "flex-1" : "w-full"}
              >
                Submit
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── WhatsApp Absent Students Dialog ── */}
        <Dialog open={!!whatsappModalData} onOpenChange={(open) => !open && setWhatsappModalData(null)}>
          <DialogContent className="max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                Absent Students
              </DialogTitle>
              <DialogDescription>
                Message the parents of students who are absent for {whatsappModalData?.subjectName}.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[60vh] -mx-6 px-6 pb-2">
              {whatsappModalData?.loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader className="h-8 w-8 animate-spin text-green-500" />
                  <p className="text-sm font-medium">Fetching absent students...</p>
                </div>
              ) : (
                <Table>
                  <TableBody>
                    {whatsappModalData?.students?.map((student, idx) => {
                      const msg = `Dear parent, your child ${student.name} is absent today for ${whatsappModalData.subjectName}.`;
                      const url = `https://wa.me/${student.contactNumber}?text=${encodeURIComponent(msg)}`;
                      
                      return (
                        <TableRow key={idx}>
                          <TableCell>
                            <p className="font-medium text-sm">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.contactNumber}</p>
                          </TableCell>
                          <TableCell align="right">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex items-center gap-2 border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = url;
                                a.target = '_blank';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }}
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                              Message
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MyPeriods;
