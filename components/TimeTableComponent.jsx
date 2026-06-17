"use client";
import { Button } from "@/components/ui/button";
import useCrud from "@/hooks/use-crud";
import { useReactToPrint } from "react-to-print";
import { DAYS } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Check, ChevronsUpDown, FileText, Loader, UserX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import PrintHeader from "@/components/PrintHeader";

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

const daysOfWeek = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const currentDay = daysOfWeek[new Date().getDay()];

// Absentees Dialog Component
const AbsenteesDialog = ({
  open,
  setOpen,
  cellData,
  day,
  periodNumber,
  absenteesList,
  useShortName = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {day} - Period {periodNumber} Absentees
          </DialogTitle>
          <DialogDescription>
            {cellData?.subjectId?.name
              ? `Subject: ${cellData.subjectId.name}`
              : ""}
            {" • Class: "}
            {useShortName ? (cellData?.classId?.shortname || cellData?.classId?.name || "") : (cellData?.classId?.name || "")}
            {cellData?.classId?.batchId?.name
              ? ` (${cellData.classId.batchId.name})`
              : ""}
          </DialogDescription>
        </DialogHeader>
        {absenteesList.length > 0 ? (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">
              Absent Students ({absenteesList.length})
            </h4>
            <div className="max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Student Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {absenteesList.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell>{student.studentId || "Unknown"}</TableCell>
                      <TableCell>{student.studentName || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-6">
            <p>Full attendance for this period</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Edit Leave Reason Dialog (for College Admin)
const EditLeaveReasonDialog = ({ open, onOpenChange, leaveRecord, apiKey, onSuccess }) => {
  const [reason, setReason] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [error, setError] = useState(false);

  const { useAddItem, useDeleteItem } = useCrud("teachers-leave-record", apiKey);
  const addLeaveRecord = useAddItem();
  const deleteLeaveRecord = useDeleteItem();

  useEffect(() => {
    if (open && leaveRecord) {
      setReason(leaveRecord.leaveReason || "");
      setError(false);
    }
  }, [open, leaveRecord]);

  const handleSubmit = async () => {
    if (reason.trim() !== "" && reason.length > 20) {
      toast.error("Leave reason should not exceed 20 characters.");
      return;
    }
    try {
      await addLeaveRecord.mutateAsync({
        teacherId: leaveRecord.teacherId,
        classId: leaveRecord.classId,
        periodNumber: leaveRecord.periodNumber,
        date: leaveRecord.date,
        leaveReason: reason,
      });
      toast.success("Leave reason updated successfully.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Error updating leave reason:", err);
      toast.error(err.message || "Error updating leave reason");
    }
  };

  const handleClear = async () => {
    if (!leaveRecord?._id) return;
    try {
      await deleteLeaveRecord.mutateAsync({ data: { _id: leaveRecord._id } });
      toast.success("Leave reason cleared successfully.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Error clearing leave reason:", err);
      toast.error(err.message || "Error clearing leave reason");
    }
  };

  if (!leaveRecord) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90%] sm:w-full sm:max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle>Edit Leave Reason</DialogTitle>
          <DialogDescription>
            Edit the leave reason for <span className="font-semibold">{leaveRecord.teacherName || "this teacher"}</span> — Period {leaveRecord.periodNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
          <div className="relative">
            <Input
              placeholder="Select or type a reason..."
              value={reason}
              onChange={(e) => {
                if (e.target.value.length > 20) setError(true);
                else setError(false);
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
          </div>
          {error && (
            <p className="text-destructive text-xs p-1">
              Leave reason should not exceed 20 characters.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {leaveRecord._id && (
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
            disabled={addLeaveRecord.isPending || error}
            onClick={handleSubmit}
            className={leaveRecord._id ? "flex-1" : "w-full"}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TimeTableComponent = ({
  apiKey,
  teacherId,
  hidePrintButton = false,
  periods = [],
  attendances = [],
  classes = [],
  teachersLeaveRecord = [],
  useShortName = false,
  hideEmptyClassRows = false,
  role,
}) => {
  const timeTableRef = useRef(null);
  const [absenteesDialogOpen, setAbsenteesDialogOpen] = useState(false);
  const [currentDialogData, setCurrentDialogData] = useState({});
  const [currentAbsenteesList, setCurrentAbsenteesList] = useState([]);

  // Edit Leave Reason state (College Admin)
  const [editLeaveOpen, setEditLeaveOpen] = useState(false);
  const [editLeaveRecord, setEditLeaveRecord] = useState(null);

  const { useFetchItems: useFetchLeaveRecords } = useCrud("teachers-leave-record", apiKey);
  const todayDateStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const liveLeaveQuery = useFetchLeaveRecords(
    0, 0,
    { date: todayDateStr },
    { staleTime: 0, refetchOnWindowFocus: true, enabled: role === "College Admin" }
  );
  const liveLeaveRecords = useMemo(() => {
    if (role === "College Admin") {
      return liveLeaveQuery.data?.teachersLeaveRecord || teachersLeaveRecord;
    }
    return teachersLeaveRecord;
  }, [role, liveLeaveQuery.data, teachersLeaveRecord]);

  const { useFetchItems } = useCrud("timeTables", apiKey);
  const fetchTimeTableQuery = useFetchItems(0, 0, {
    day: teacherId ? null : currentDay,
    teacherId: teacherId ? teacherId : null,
  });

  const timeTable = useMemo(() => {
    return fetchTimeTableQuery.data?.timeTables || [];
  }, [fetchTimeTableQuery.data]);

  const router = useRouter();

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  const timeTableData = teacherId
    ? timeTable.reduce(
      (acc, timeTable) => {
        const slots = timeTable.timeSlots.filter(
          (slot) => slot.teacherId?._id === teacherId && !slot.validTo
        );
        const classId = timeTable.classId;
        return {
          timeSlots: [
            ...(acc.timeSlots || []),
            ...slots.map((slot) => ({ ...slot, classId })),
          ],
        };
      },
      { timeSlots: [] }
    )
    : timeTable.reduce(
      (acc, timeTable) => {
        // Only get slots for the current day
        const slots = timeTable.timeSlots.filter(
          (slot) => slot.day === currentDay && !slot.validTo
        );

        // Make sure we're associating the correct classId with each slot
        const classId = timeTable.classId;
        return {
          timeSlots: [
            ...(acc.timeSlots || []),
            ...slots.map((slot) => ({ ...slot, classId })),
          ],
        };
      },
      { timeSlots: [] }
    );

  const getCellData = useCallback(
    (periodNumber, day, classId = null) => {
      if (teacherId) {
        // For teacher view
        return timeTableData.timeSlots?.find(
          (slot) => slot.periodNumber === periodNumber && slot.day === day
        );
      } else {
        // For class view
        return timeTableData.timeSlots?.find(
          (slot) =>
            slot.periodNumber === periodNumber &&
            slot.day === day &&
            (classId ? (slot.classId?._id || slot.classId)?.toString() === classId?.toString() : true)
        );
      }
    },
    [timeTableData.timeSlots, teacherId, currentDay]
  );

  const getPeriodTime = useCallback(
    (periodNumber) => {
      const period = periods.find((p) => p.periodNumber === periodNumber);
      return period ? period.formattedTime : `Period ${periodNumber}`;
    },
    [periods]
  );

  const filteredClasses = useMemo(() => {
    if (!hideEmptyClassRows || teacherId) return classes;

    return classes.filter((classItem) => {
      return timeTableData.timeSlots?.some(
        (slot) =>
          (slot.classId?._id || slot.classId)?.toString() === classItem._id?.toString() &&
          (slot.subjectId || slot.teacherId)
      );
    });
  }, [classes, hideEmptyClassRows, teacherId, timeTableData.timeSlots]);

  const showAbsenteesDialog = useCallback(
    (periodNumber, day, cellData, absenteesList) => {
      setCurrentDialogData({
        periodNumber,
        day,
        cellData,
      });
      setCurrentAbsenteesList(absenteesList);
      setAbsenteesDialogOpen(true);
    },
    []
  );

  const handlePrint = useReactToPrint({
    contentRef: timeTableRef,
    documentTitle: "Time Table",
  });

  return (
    <div>
      <div
        ref={timeTableRef}
        className="overflow-x-auto border border-collapse rounded-md  "
      >
        <PrintHeader
          apiKey={apiKey}
          title={teacherId ? "MY TIME TABLE" : "TIME TABLE"}
        />
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="border bg-accent sticky left-0 rig z-10"></TableHead>
              {periods.map((period) => (
                <TableHead
                  key={period?._id}
                  className="text-center border-t font-bold whitespace-nowrap"
                >
                  <div className="flex flex-col items-center text-xxs">
                    <span>{getPeriodTime(period.periodNumber)}</span>
                    <span className="text-xxs text-muted-foreground">
                      Period {period.periodNumber}
                    </span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {teacherId
              ? DAYS.map((day) => (
                <TableRow key={day} className="hover:bg-accent/50">
                  <TableCell className="border font-medium bg-accent sticky left-0 z-10">
                    <div className="flex text-xs items-center gap-2">
                      {day.slice(0, 3)}
                    </div>
                  </TableCell>
                  {periods.map((period) => {
                    const cellData = getCellData(period.periodNumber, day);

                    // Check for marked attendance
                    const markedAttendance = attendances.filter(
                      (attendance) =>
                        attendance.periodNumber === period.periodNumber &&
                        attendance.day === day &&
                        attendance.teacherId?._id === teacherId &&
                        (!cellData?.subjectId || (attendance.subjectId?._id || attendance.subjectId) === (cellData.subjectId?._id || cellData.subjectId))
                    );

                    // Prepare absentees list
                    const absentees = markedAttendance?.map((attendance) => ({
                      absentees: attendance?.attendanceData?.filter(
                        (record) => record.present === false
                      ),
                    }));

                    const absenteesList =
                      absentees?.flatMap((item) => item.absentees || []) ||
                      [];
                    const isAttendanceMarked = false;
                    const leaveRecord = null;

                    return (
                      <TableCell
                        onClick={() => {
                          if (isAttendanceMarked && cellData) {
                            showAbsenteesDialog(
                              period.periodNumber,
                              day,
                              cellData,
                              absenteesList
                            );
                          }
                        }}
                        key={period?._id}
                        className={`${(isAttendanceMarked && cellData)
                          ? "bg-green-300/50 print:bg-inherit"
                          : leaveRecord
                            ? "bg-red-100/50 print:bg-inherit"
                            : ""
                          } border text-center  cursor-pointer print:max-w-32`}
                      >
                        {cellData ? (
                          <div className="flex flex-col items-center justify-center">
                            <p className="font-medium text-xxs whitespace-nowrap print:whitespace-normal">
                              {cellData.subjectId?.name || (typeof cellData.subjectId === 'string' ? cellData.subjectId : "")}
                            </p>
                            <p className="text-xxs text-accent-foreground whitespace-nowrap print:whitespace-normal">
                              {useShortName 
                                 ? (cellData.classId?.shortname || cellData.classId?.name || (typeof cellData.classId === 'string' ? cellData.classId : "")) 
                                 : (cellData.classId?.name || (typeof cellData.classId === 'string' ? cellData.classId : ""))}
                            </p>

                            {/* Attendance badge */}
                            {isAttendanceMarked &&
                              absenteesList.length > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="outline"
                                        className="mt-1 text-xxs no-print"
                                      >
                                        <UserX className="h-3 w-3 mr-1" />
                                        {absenteesList.length}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View absent students</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            {leaveRecord && !isAttendanceMarked && (
                              <div className="flex items-center gap-1 text-xxs text-muted-foreground justify-center">
                                <AlertCircle className="text-red-500 h-3 w-3" />
                                <span>{leaveRecord.leaveReason}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-semibold">-</span>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
              : filteredClasses.map((classItem) => (
                <TableRow key={classItem?._id} className="hover:bg-accent/50">
                  <TableCell className="border font-medium bg-accent sticky left-0 z-10">
                    <div className="flex items-center text-xs whitespace-nowrap gap-2">
                      {useShortName ? (classItem.shortname || classItem.name) : classItem.name}
                    </div>
                  </TableCell>
                  {periods.map((period) => {
                    const cellData = getCellData(
                      period.periodNumber,
                      currentDay,
                      classItem?._id
                    );
                    const markedAttendance = attendances.filter(
                      (attendance) =>
                        attendance.periodNumber === period.periodNumber &&
                        attendance.day === currentDay &&
                        (attendance.classId?._id || attendance.classId)?.toString() === classItem?._id?.toString() &&
                        (!cellData?.subjectId || (attendance.subjectId?._id || attendance.subjectId) === (cellData.subjectId?._id || cellData.subjectId)) &&
                        (!cellData?.teacherId || (attendance.teacherId?._id || attendance.teacherId) === (cellData.teacherId?._id || cellData.teacherId))
                    );
                    const absentees = markedAttendance.map((attendance) => ({
                      absentees: attendance?.attendanceData?.filter(
                        (record) => record.present === false
                      ),
                    }));
                    const absenteesList =
                      absentees?.flatMap((item) => item.absentees || []) ||
                      [];
                    const isAttendanceMarked = markedAttendance?.length > 0;

                    const leaveRecord = liveLeaveRecords.find((record) => {
                      const recordDate = new Date(record.date);
                      const recordDay = recordDate.toLocaleDateString(
                        "en-US",
                        { weekday: "long" }
                      );
                      const recordDateStr = recordDate.toISOString().split('T')[0];
                      const todayStr = new Date().toISOString().split('T')[0];
                      
                      return (
                        record.periodNumber === period.periodNumber &&
                        (record.teacherId?._id || record.teacherId) === (cellData?.teacherId?._id || cellData?.teacherId) &&
                        recordDay === currentDay &&
                        recordDateStr === todayStr
                      );
                    });

                    const canEditLeave = role === "College Admin" && cellData && cellData.teacherId && !isAttendanceMarked;

                    return (
                      <TableCell
                        onClick={() => {
                          if (isAttendanceMarked && cellData) {
                            showAbsenteesDialog(
                              period.periodNumber,
                              currentDay,
                              cellData,
                              absenteesList
                            );
                          } else if (canEditLeave) {
                            if (leaveRecord) {
                              setEditLeaveRecord({
                                ...leaveRecord,
                                teacherName: cellData.teacherId?.name || "",
                                teacherId: leaveRecord.teacherId?._id || leaveRecord.teacherId,
                                classId: leaveRecord.classId?._id || leaveRecord.classId,
                              });
                            } else {
                              // New leave record — no _id yet
                              setEditLeaveRecord({
                                teacherName: cellData.teacherId?.name || "",
                                teacherId: cellData.teacherId?._id || cellData.teacherId,
                                classId: classItem?._id,
                                periodNumber: period.periodNumber,
                                date: new Date().toISOString(),
                                leaveReason: "",
                              });
                            }
                            setEditLeaveOpen(true);
                          }
                        }}
                        key={period?._id}
                        className={`${(isAttendanceMarked && cellData)
                          ? "bg-green-300/50 print:bg-inherit"
                          : leaveRecord
                            ? "bg-red-100/50 print:bg-inherit"
                            : ""
                          } border text-center cursor-pointer print:max-w-32`}
                      >
                        {!!cellData ? (
                          <div className="flex flex-col items-center justify-center">
                             <p className="font-medium text-xxs whitespace-nowrap print:whitespace-normal">
                               {cellData.teacherId?.name || (typeof cellData.teacherId === 'string' ? cellData.teacherId : "")}
                             </p>
                             <p className="text-xxs text-accent-foreground whitespace-nowrap print:whitespace-normal">
                               {cellData.subjectId?.name || (typeof cellData.subjectId === 'string' ? cellData.subjectId : "")}
                             </p>

                            {/* Attendance badge */}
                            {isAttendanceMarked &&
                              absenteesList.length > 0 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="outline"
                                        className="mt-1 text-xxs no-print"
                                      >
                                        <UserX className="h-3 w-3 mr-1" />
                                        {absenteesList.length}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View absent students</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}

                            {leaveRecord && !isAttendanceMarked && (
                              <div className="flex items-center gap-1 text-xxs text-muted-foreground justify-center">
                                <AlertCircle className="text-red-500 h-3 w-3" />
                                <span>{leaveRecord.leaveReason}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-semibold">-</span>
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Absentees Dialog */}
      <AbsenteesDialog
        open={absenteesDialogOpen}
        setOpen={setAbsenteesDialogOpen}
        cellData={currentDialogData.cellData}
        day={currentDialogData.day}
        periodNumber={currentDialogData.periodNumber}
        absenteesList={currentAbsenteesList}
        useShortName={useShortName}
      />

      {/* Edit Leave Reason Dialog (College Admin) */}
      <EditLeaveReasonDialog
        open={editLeaveOpen}
        onOpenChange={setEditLeaveOpen}
        leaveRecord={editLeaveRecord}
        apiKey={apiKey}
        onSuccess={() => liveLeaveQuery.refetch()}
      />

      {!hidePrintButton && (
        <div className="flex justify-end mt-4 no-print">
          <Button variant="default" onClick={handlePrint}>
            Print
          </Button>
        </div>
      )}
    </div>
  );
};

export default TimeTableComponent;
