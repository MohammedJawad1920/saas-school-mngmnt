"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Edit,
  Loader,
  AlertCircle,
  CheckCircle2,
  UserX,
  Save,
} from "lucide-react";

// UI Components
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Progress } from "./ui/progress"; // Import Progress component

// Hooks and Utils
import { DAYS, parseDate } from "@/lib/utils";
import useCrud from "@/hooks/use-crud";
import { useReactToPrint } from "react-to-print";
import { Input } from "./ui/input";
import ConfirmationPopup from "./ConfirmationPopup";

// Absentees Dialog Component - Extracted to improve readability
const AbsenteesDialog = ({
  open,
  setOpen,
  cellData,
  day,
  periodNumber,
  absenteesList,
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
            {cellData?.teacherId?.name
              ? ` • Teacher: ${cellData.teacherId.name}`
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
            <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
            <p>Full attendance for this period</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Component for rendering a single timetable cell
const TimetableSlot = ({
  periodNumber,
  day,
  cellData,
  category,
  selectedClass,
  onCellClick,
  isAttendanceMarked,
  absentees,
  showAbsenteesDialog,
  isPendingChange,
  leaveReason,
}) => {
  const hasData = cellData && (cellData.subjectId || cellData.teacherId);
  const absenteesList = useMemo(
    () => absentees?.flatMap((item) => item.absentees || []) || [],
    [absentees]
  );

  return (
    <TableCell
      className={`${(isAttendanceMarked && hasData)
        ? "bg-green-300/50 print:bg-inherit"
        : isPendingChange
          ? "bg-blue-300/50 print:bg-inherit"
          : leaveReason
            ? "bg-red-100/50 print:bg-inherit"
            : cellData?._fromHistory
              ? "bg-orange-50/50 border-dashed print:bg-inherit"
              : ""
        } border text-center cursor-pointer transition-colors whitespace-nowrap print:whitespace-normal print:max-w-32 print:p-1`}
      onClick={() => {
        onCellClick(periodNumber, day);
        if (isAttendanceMarked && hasData && category !== "class") {
          showAbsenteesDialog(periodNumber, day, cellData, absenteesList);
        }
      }}
    >
      {hasData ? (
        <div className="flex flex-col items-center justify-center relative">
          <p className="font-medium text-xxs truncate">
            {cellData.subjectId?.name || (typeof cellData.subjectId === 'string' ? cellData.subjectId : "")}
          </p>
          <p className="text-xxs text-accent-foreground">
            {(category === "class" && selectedClass) || category === "date"
              ? (cellData.teacherId?.name || (typeof cellData.teacherId === 'string' ? cellData.teacherId : ""))
              : (cellData.classId?.name || (typeof cellData.classId === 'string' ? cellData.classId : ""))}
          </p>
          {cellData?._fromHistory && (
            <p className="text-[8px] text-orange-500 font-bold opacity-70">
              {cellData._historyDate}
            </p>
          )}
          {leaveReason && (
            <div className="flex items-center gap-1 text-xxs text-muted-foreground justify-center mt-1">
              <AlertCircle className="text-red-500 h-3 w-3" />
              <span className="truncate max-w-[100px]" title={leaveReason}>{leaveReason}</span>
            </div>
          )}
          {isAttendanceMarked && absenteesList.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="mt-1 text-xxs no-print"
                    onClick={(e) => {
                      e.stopPropagation();
                      showAbsenteesDialog(
                        periodNumber,
                        day,
                        cellData,
                        absenteesList
                      );
                    }}
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
        </div>
      ) : (
        <div className="flex items-center justify-center p-2 ">
          {category === "class" && (
            <Edit className="text-muted-foreground h-4 w-4 no-print" />
          )}
        </div>
      )}
    </TableCell>
  );
};

// Save Progress Dialog Component
const SaveProgressDialog = ({ open, progress, total, completed }) => {
  const percentage = Math.round((progress / total) * 100);

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Saving Timetable Changes</DialogTitle>
          <DialogDescription>
            Please wait while your changes are being saved...
          </DialogDescription>
        </DialogHeader>
        <div className="my-6 space-y-4">
          <Progress value={percentage} className="h-2 w-full" />
          <p className="text-center">
            {completed ? (
              <span className="text-green-600 flex items-center justify-center">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                All changes saved successfully!
              </span>
            ) : (
              `Saving changes: ${progress} of ${total} (${percentage}%)`
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main TimeTablesManagement component
const TimeTablesManagements = ({
  periods = [],
  classes = [],
  teachers = [],
  subjects = [],
  apiKey,
}) => {
  // State management
  const [category, setCategory] = useState("class");
  const [timeTableData, setTimeTableData] = useState({ timeSlots: [] });
  const [selectedClass, setSelectedClass] = useState(classes[0]?._id || "");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [date, setDate] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [absenteesDialogOpen, setAbsenteesDialogOpen] = useState(false);
  const [currentAbsenteesList, setCurrentAbsenteesList] = useState([]);
  const [currentDialogData, setCurrentDialogData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherScheduleConflicts, setTeacherScheduleConflicts] = useState([]);
  const [existingTimeSlotId, setExistingTimeSlotId] = useState(null);
  const [pendingChanges, setPendingChanges] = useState([]);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Save progress tracking
  const [saveProgressOpen, setSaveProgressOpen] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveTotal, setSaveTotal] = useState(0);
  const [saveCompleted, setSaveCompleted] = useState(false);

  // Helper to safely get string ID from object or string
  const getStrId = useCallback((val) => {
    if (!val) return "";
    return (val._id || val.id || val).toString();
  }, []);

  const day = useMemo(
    () =>
      date
        ? parseDate(date).toLocaleDateString("en-US", { weekday: "long" })
        : "",
    [date]
  );

  // References and hooks
  const router = useRouter();
  const timeTableRef = useRef();
  const { useFetchItems, useUpdateItem, useDeleteItem } = useCrud(
    "timeTables",
    apiKey
  );
  const { useFetchItems: useFetchAttendance } = useCrud("attendances", apiKey);
  const { useFetchItems: useFetchTeachersLeaveRecord } = useCrud(
    "teachers-leave-record",
    apiKey
  );

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  const endDate = new Date();

  const fetchAttendanceQuery = useFetchAttendance(0, 0, {
    startDate: category === "date" && date 
      ? date
      : new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    endDate: category === "date" && date ? date : new Date().toISOString().split("T")[0],
    day: category === "date" ? day : undefined,
    classId: category === "class" && selectedClass ? selectedClass : undefined,
    teacherId:
      category === "teacher" && selectedTeacher ? selectedTeacher : undefined,
  });

  const leaveRecordQuery = useFetchTeachersLeaveRecord(
    0,
    0,
    category === "date" && date
      ? { date }
      : {
        isForTimeTable: "true",
        teacherId:
          category === "teacher" && selectedTeacher
            ? selectedTeacher
            : undefined,
      },
    {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    }
  );

  const attendanceData = fetchAttendanceQuery.data?.attendances || [];
  const leaveRecords = leaveRecordQuery.data?.teachersLeaveRecord || [];

  // Optimized historical map for fast lookups
  const historicalMap = useMemo(() => {
    const map = {};
    // Process in chronological order so later ones (more recent) overwrite earlier ones
    [...attendanceData]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach((a) => {
        const classId = getStrId(a.classId);
        const key = `${classId}_${a.periodNumber}_${a.day}`;
        map[key] = {
          ...a,
          _historyDate: new Date(a.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
        };
      });
    return map;
  }, [attendanceData]);

  // Queries for data fetching
  const fetchQuery = useMemo(() => {
    return {
      classId:
        category === "class" && selectedClass ? selectedClass : undefined,
      teacherId:
        category === "teacher" && selectedTeacher ? selectedTeacher : undefined,
      day: category === "date" && date ? day : undefined,
    };
  }, [category, selectedClass, selectedTeacher, date, day]);

  const fetchItemsQuery = useFetchItems(0, 0, fetchQuery);
  const allTimeTablesQuery = useFetchItems(0, 0, {});
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  // Handler for showing absentees dialog
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

  // Periodically refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  // Filter subjects based on selected class
  const filteredSubjects = useMemo(() => {
    const selectedClassData = classes.find((cls) => cls?._id === selectedClass);
    return subjects.filter((subject) =>
      selectedClassData?.subjectIds?.includes(subject?._id)
    );
  }, [classes, selectedClass, subjects]);

  // Check for teacher scheduling conflicts
  const checkTeacherConflicts = useCallback(
    (teacherId, periodNumber, day, existingSlotId = null) => {
      if (!allTimeTablesQuery.data?.timeTables || !teacherId) return [];

      const conflicts = [];

      allTimeTablesQuery.data.timeTables.forEach((timeTable) => {
        if (!timeTable.timeSlots) return;

        timeTable.timeSlots.forEach((slot) => {
          // Skip comparing with itself when editing
          if (existingSlotId && slot?._id === existingSlotId) return;

          // Skip historical/inactive slots
          if (slot.validTo) return;

          if (
            slot?.teacherId?._id === teacherId &&
            slot.periodNumber === periodNumber &&
            slot.day === day
          ) {
            // Get class name for better context
            const conflictClass = classes.find(
              (cls) => cls?._id === timeTable.classId?._id
            );

            conflicts.push({
              class: conflictClass?.name || "Unknown Class",
              subject: slot.subjectId?.name,
              teacherName: slot.teacherId?.name,
              day: slot.day,
              period: slot.periodNumber,
            });
          }
        });
      });

      return conflicts;
    },
    [allTimeTablesQuery.data, classes]
  );

  const checkPendingConflicts = (
    teacherId,
    periodNumber,
    day,
    currentChangeId = null
  ) => {
    // Skip if no teacher selected
    if (!teacherId) return [];

    const conflicts = [];

    // Check against other pending changes
    pendingChanges.forEach((change) => {
      // Skip comparing with the current change when editing
      if (
        currentChangeId &&
        change.timeSlots.periodNumber === parseInt(periodNumber) &&
        change.timeSlots.day === day &&
        change.classId === selectedClass
      ) {
        return;
      }

      if (
        change.timeSlots.teacherId === teacherId &&
        change.timeSlots.periodNumber === parseInt(periodNumber) &&
        change.timeSlots.day === day
      ) {
        // Get class name for the conflict
        const conflictClass = classes.find(
          (cls) => cls?._id === change.classId
        );

        conflicts.push({
          class: conflictClass?.name || "Unknown Class",
          subject:
            subjects.find((s) => s._id === change.timeSlots.subjectId)?.name ||
            "Unknown Subject",
          teacherName:
            teachers.find((t) => t._id === teacherId)?.name ||
            "Unknown Teacher",
          day: day,
          period: periodNumber,
          isPending: true,
        });
      }
    });

    return conflicts;
  };

  // Process timetable data when query results change
  useEffect(() => {
    if (!fetchItemsQuery.data) return;

    const newData = fetchItemsQuery.data.timeTables || [];

    if (category === "teacher" && selectedTeacher) {
      // Aggregate all slots for this teacher across classes
      const timeSlotsByTeacher = newData.reduce(
        (acc, timeTable) => {
          const slots = timeTable.timeSlots.filter(
            (slot) => slot.teacherId?._id === selectedTeacher && !slot.validTo
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
      );

      setTimeTableData(timeSlotsByTeacher);
    } else if (category === "date" && date) {
      // Use allTimeTablesQuery if available to ensure we have data for all classes, 
      // falling back to fetchItemsQuery if not.
      const sourceData = allTimeTablesQuery.data?.timeTables || fetchItemsQuery.data?.timeTables || [];
      
      const timeSlotsByDate = sourceData.reduce(
        (acc, timeTable) => {
          const slots = timeTable.timeSlots.filter((slot) => {
            if (slot.day !== day) return false;
            
            const validFromDS = slot.validFrom ? new Date(slot.validFrom).toISOString().split('T')[0] : null;
            const validToDS = slot.validTo ? new Date(slot.validTo).toISOString().split('T')[0] : null;
            
            const isStarted = !validFromDS || validFromDS <= date;
            const isNotEnded = !validToDS || validToDS > date;
            
            return isStarted && isNotEnded;
          });
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
      setTimeTableData(timeSlotsByDate || { timeSlots: [] });
    } else {
      const classTimeTable = newData[0];
      if (classTimeTable && classTimeTable.timeSlots) {
        const classId = classTimeTable.classId;
        const activeSlots = classTimeTable.timeSlots.filter(slot => !slot.validTo);
        setTimeTableData({
          ...classTimeTable,
          timeSlots: activeSlots.map((slot) => ({
            ...slot,
            classId,
          })),
        });
      } else {
        setTimeTableData(classTimeTable || { timeSlots: [] });
      }
    }
  }, [
    fetchItemsQuery.data,
    allTimeTablesQuery.data,
    category,
    selectedTeacher,
    selectedClass,
    day,
    date,
  ]);

  // Check for conflicts when form values change
  useEffect(() => {
    if (selectedTeacher && selectedPeriod && selectedDay) {
      // Get existing conflicts from database
      const existingConflicts = checkTeacherConflicts(
        selectedTeacher,
        parseInt(selectedPeriod),
        selectedDay,
        existingTimeSlotId
      );

      // Get conflicts from pending changes
      const pendingConflicts = checkPendingConflicts(
        selectedTeacher,
        selectedPeriod,
        selectedDay,
        existingTimeSlotId
          ? `${selectedDay}-${selectedPeriod}-${selectedClass}`
          : null
      );

      // Show all conflicts
      setTeacherScheduleConflicts([...existingConflicts, ...pendingConflicts]);
    } else {
      setTeacherScheduleConflicts([]);
    }
  }, [
    selectedTeacher,
    selectedPeriod,
    selectedDay,
    existingTimeSlotId,
    checkTeacherConflicts,
    pendingChanges,
    selectedClass,
  ]);

  // Helper to format period time
  const getPeriodTime = useCallback(
    (periodNumber) => {
      const period = periods.find((p) => p.periodNumber === periodNumber);
      return period ? period.formattedTime : `Period ${periodNumber}`;
    },
    [periods]
  );

  // Calculate class statistics
  const classStats = useMemo(() => {
    if (!timeTableData.timeSlots) return { total: 0, filled: 0, percentage: 0 };

    const totalSlots = periods.length * DAYS.length;
    const filledSlots = timeTableData?.timeSlots?.filter(
      (slot) => slot.teacherId !== null || slot.subjectId !== null
    ).length;

    return {
      total: totalSlots,
      filled: filledSlots,
      percentage: Math.round((filledSlots / totalSlots) * 100),
    };
  }, [timeTableData.timeSlots, periods.length]);

  // Get cell data for specific period and day
  const getCellData = useCallback(
    (periodNumber, day, classId) => {
      // First check pending changes for the specific class
      const targetClassId = (
        classId || (category === "class" ? selectedClass : undefined)
      )?.toString();
      const pendingChange = pendingChanges.find(
        (change) =>
          change.timeSlots.periodNumber === periodNumber &&
          change.timeSlots.day === day &&
          change.classId?.toString() === targetClassId // Only show pending changes for this class
      );

      if (pendingChange) {
        // Convert pending change to cell data format
        return {
          periodNumber,
          day,
          subjectId: {
            _id: pendingChange.timeSlots.subjectId,
            name:
              subjects.find((s) => s._id === pendingChange.timeSlots.subjectId)
                ?.name || "",
          },
          teacherId: {
            _id: pendingChange.timeSlots.teacherId,
            name:
              teachers.find((t) => t._id === pendingChange.timeSlots.teacherId)
                ?.name || "",
          },
          classId: {
            _id: pendingChange.classId,
            name:
              classes.find((c) => c._id === pendingChange.classId)?.name || "",
          },
          _isPending: true,
        };
      }

      // If no pending change, check existing data
      // Use allTimeTablesQuery for a more comprehensive source in date view
      const sourceTimeTables = category === "date" 
        ? (allTimeTablesQuery.data?.timeTables || []) 
        : (timeTableData.timeSlots ? [timeTableData] : []);

      let existingSlot;
      if (category === "date") {
        const targetTimeTable = sourceTimeTables.find(
          (tt) => (tt.classId?._id || tt.classId)?.toString() === targetClassId
        );
        
        // Find the slot that was active on this specific date
        existingSlot = targetTimeTable?.timeSlots?.find((slot) => {
          if (slot.periodNumber !== periodNumber || slot.day !== day) return false;
          
          if (!date) return !slot.validTo; // If no date selected, show current
          
          const effectiveValidFrom = slot.validFrom || targetTimeTable.updatedAt || targetTimeTable.createdAt;
          const validFromDS = effectiveValidFrom ? new Date(effectiveValidFrom).toISOString().split('T')[0] : null;
          const validToDS = slot.validTo ? new Date(slot.validTo).toISOString().split('T')[0] : null;
          
          // Slot is valid if it was created before/on this date AND (not yet invalidated OR invalidated after this date)
          const isStarted = !validFromDS || validFromDS <= date;
          const isNotEnded = !validToDS || validToDS > date;
          
          return isStarted && isNotEnded;
        });
      } else {
        // For standard views, only show currently active slots (no validTo date)
        existingSlot = timeTableData.timeSlots?.find(
          (slot) =>
            slot.periodNumber === periodNumber &&
            slot.day === day &&
            (!targetClassId || getStrId(slot.classId) === getStrId(targetClassId)) &&
            !slot.validTo
        );
      }

      // FOR DATE VIEW: If attendance exists, use the data from attendance (Teacher/Subject)
      if (category === "date" && date) {
        const markedAttendance = attendanceData.find(
          (attendance) =>
            attendance.periodNumber === periodNumber &&
            attendance.day === day &&
            (attendance.classId?._id || attendance.classId)?.toString() === targetClassId &&
            new Date(attendance.date).toISOString().split('T')[0] === date
        );

        if (markedAttendance) {
          return {
            ...existingSlot,
            periodNumber,
            day,
            subjectId: markedAttendance.subjectId,
            teacherId: markedAttendance.teacherId,
            classId: markedAttendance.classId,
            _fromAttendance: true,
            leaveReason: markedAttendance.leaveReason,
          };
        }

        // FALLBACK: If no attendance but a leave record exists (even if timetable reset)
        const leaveRecord = leaveRecords.find(
          (record) =>
            record.periodNumber === periodNumber &&
            (record.classId?._id || record.classId)?.toString() === targetClassId
        );

        if (leaveRecord) {
          return {
            ...existingSlot,
            periodNumber,
            day,
            teacherId: leaveRecord.teacherId,
            classId: leaveRecord.classId,
            leaveReason: leaveRecord.leaveReason,
            _fromLeaveRecord: true,
          };
        }

      }

      return existingSlot;
    },
    [
      timeTableData.timeSlots,
      allTimeTablesQuery.data?.timeTables,
      pendingChanges,
      subjects,
      teachers,
      classes,
      selectedClass,
      category,
      date,
      day,
      attendanceData,
      leaveRecords,
      historicalMap,
    ]
  );

  // Check if a cell has pending changes
  const isPendingChange = useCallback(
    (periodNumber, day, classId) => {
      const targetClassId = classId || selectedClass;
      return pendingChanges.some(
        (change) =>
          change.timeSlots.periodNumber === periodNumber &&
          change.timeSlots.day === day &&
          change.classId === targetClassId
      );
    },
    [pendingChanges, selectedClass]
  );

  // Handle cell click to open edit dialog
  const handleCellClick = useCallback(
    (periodNumber, day) => {
      if (category !== "class" || !periodNumber || !day) return;

      const existingData = getCellData(periodNumber, day);

      setSelectedPeriod(periodNumber.toString());
      setSelectedDay(day);
      setSelectedSubject(existingData?.subjectId?._id || selectedSubject || "");
      setSelectedTeacher(existingData?.teacherId?._id || selectedTeacher || "");
      setExistingTimeSlotId(existingData?._id || null);
      setEditDialogOpen(true);
    },
    [category, getCellData]
  );

  // Handle adding changes to pending queue
  const handleAddToPendingChanges = (e) => {
    e.preventDefault();

    if (selectedClass) {
      const existingConflicts = checkTeacherConflicts(
        selectedTeacher,
        parseInt(selectedPeriod),
        selectedDay,
        existingTimeSlotId
      );

      // Get conflicts from pending changes
      const pendingConflicts = checkPendingConflicts(
        selectedTeacher,
        selectedPeriod,
        selectedDay,
        existingTimeSlotId
          ? `${selectedDay}-${selectedPeriod}-${selectedClass}`
          : null
      );

      // Combine all conflicts
      const allConflicts = [...existingConflicts, ...pendingConflicts];

      // If conflicts exist, show error and don't proceed
      if (allConflicts.length > 0) {
        toast.error(
          "Teacher scheduling conflict detected. Cannot add to pending changes."
        );

        // Update conflict state to display in UI
        setTeacherScheduleConflicts(allConflicts);
        return;
      }
    }

    const newChange = {
      classId: selectedClass,
      timeSlots: {
        day: selectedDay,
        periodNumber: parseInt(selectedPeriod),
        subjectId: selectedSubject,
        teacherId: selectedTeacher,
      },
    };

    // If we're editing an existing slot, include its ID
    if (existingTimeSlotId) {
      newChange.timeSlots._id = existingTimeSlotId;
    }

    // Add timetable _id if it exists
    if (timeTableData?._id) {
      newChange._id = timeTableData?._id;
    }

    // Check if we're updating an existing pending change
    const existingIndex = pendingChanges.findIndex(
      (change) =>
        change.timeSlots.periodNumber === parseInt(selectedPeriod) &&
        change.timeSlots.day === selectedDay &&
        change.classId === selectedClass
    );

    if (existingIndex !== -1) {
      // Update existing pending change
      const updatedChanges = [...pendingChanges];
      updatedChanges[existingIndex] = newChange;
      setPendingChanges(updatedChanges);
    } else {
      // Add new pending change
      setPendingChanges([...pendingChanges, newChange]);
    }

    setHasPendingChanges(true);
    setEditDialogOpen(false);
    toast.success("Changes added to queue. Save all to apply changes.");

    // Reset form
    setExistingTimeSlotId(null);
  };

  // Process changes in batches to prevent timeout
  const processBatchedChanges = async (changes, batchSize = 10) => {
    const batches = [];
    for (let i = 0; i < changes.length; i += batchSize) {
      batches.push(changes.slice(i, i + batchSize));
    }

    // Open progress dialog
    setSaveProgressOpen(true);
    setSaveTotal(changes.length);
    setSaveProgress(0);
    setSaveCompleted(false);

    let processedCount = 0;
    let results = [];

    try {
      // Process each batch in sequence
      for (const batch of batches) {
        const batchResult = await updateItem.mutateAsync({
          data: batch,
        });

        // Update progress
        processedCount += batch.length;
        setSaveProgress(processedCount);

        // Collect results
        if (batchResult && Array.isArray(batchResult.timeTables)) {
          results = [...results, ...batchResult.timeTables];
        }

        // Small delay to allow UI updates
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setSaveCompleted(true);
      const isComplete = processedCount === changes.length;

      // Close dialog after a delay
      setTimeout(() => {
        setSaveProgressOpen(false);
        setPendingChanges([]);
        setHasPendingChanges(false);
      }, 1500);

      if (isComplete) {
        toast.success("All timetable changes saved successfully!");
      } else {
        toast.warning(
          `Saved ${processedCount} of ${changes.length} changes. Some items may have failed.`
        );
      }

      // Refresh data
      fetchItemsQuery.refetch();
      allTimeTablesQuery.refetch();

      return results;
    } catch (error) {
      setSaveProgressOpen(false);
      console.error("Error in batch processing:", error);
      throw error;
    }
  };

  // Form submission handler with batched processing
  const handleSubmit = async (e) => {
    if (pendingChanges.length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      e.preventDefault();
      setIsSubmitting(true);

      // Use batched processing instead of sending all at once
      await processBatchedChanges(pendingChanges, 15); // Process in batches of 15
    } catch (error) {
      console.error("Error updating time table:", error.message);
      toast.error(
        `Error updating time table: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetTimetable = async () => {
    try {
      setIsSubmitting(true);

      // Create a reset request - this will clear all time slots for this class
      await deleteItem.mutateAsync({ data: { ids: [timeTableData?._id] } });

      // Clear any pending changes for this class
      const remainingChanges = pendingChanges.filter(
        (change) => change.classId !== selectedClass
      );

      setPendingChanges(remainingChanges);
      if (remainingChanges.length === 0) {
        setHasPendingChanges(false);
      }

      // Clear local timetable data to prevent stale ID issues
      setTimeTableData({ timeSlots: [] });

      toast.success("Time table reset successfully!");

      // Refresh data
      fetchItemsQuery.refetch();
      allTimeTablesQuery.refetch();
    } catch (error) {
      console.error("Error resetting time table:", error.message);
      toast.error(
        `Error resetting time table: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAllTimetables = async () => {
    try {
      setIsSubmitting(true);

      // Create a reset request for ALL classes
      await deleteItem.mutateAsync({ data: { resetAll: true } });

      // Clear all pending changes
      setPendingChanges([]);
      setHasPendingChanges(false);

      // Clear local timetable data
      setTimeTableData({ timeSlots: [] });

      toast.success("All time tables reset successfully!");

      // Refresh data
      fetchItemsQuery.refetch();
      allTimeTablesQuery.refetch();
    } catch (error) {
      console.error("Error resetting all time tables:", error.message);
      toast.error(
        `Error resetting all time tables: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Discard all pending changes
  const handleDiscardChanges = () => {
    setPendingChanges([]);
    setHasPendingChanges(false);
    toast.info("All pending changes discarded");
  };

  // Get current view title for display
  const getCurrentViewTitle = useMemo(() => {
    if (category === "class") {
      return classes.find((c) => c?._id === selectedClass)?.name || "Class";
    } else if (category === "teacher") {
      return (
        teachers.find((t) => t?._id === selectedTeacher)?.name || "Teacher"
      );
    } else {
      return date ? `Date: ${date}` : "";
    }
  }, [category, selectedClass, selectedTeacher, date, classes, teachers]);

  // Set up print functionality
  const handlePrint = useReactToPrint({
    contentRef: timeTableRef,
    documentTitle: `Time Table - ${getCurrentViewTitle}`,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 mb-6 no-print">
        <div className="w-full md:w-1/4">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="class">Manage Time Table</SelectItem>
                <SelectItem value="teacher">
                  View Time Table By Teacher
                </SelectItem>
                <SelectItem value="date">View Time Table By Date</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {category === "teacher" && (
          <div className="w-full md:w-1/4">
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher?._id} value={teacher?._id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
        {category === "date" && (
          <div className="w-full md:w-1/4">
            <Input
              name="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        )}

        {category === "class" && (
          <div className="w-full md:w-1/4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem?._id} value={classItem?._id}>
                      {classItem.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Stats Badges */}
        {category === "class" && selectedClass && (
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-xs md:text-sm py-2 px-3">
              Total Periods: {classStats.total}
            </Badge>
            <Badge
              variant={classStats.percentage === 100 ? "success" : "secondary"}
              className="text-xs md:text-sm py-2 px-3"
            >
              {classStats.filled} Scheduled ({classStats.percentage}%)
            </Badge>
          </div>
        )}
      </div>
      {category === "class" && hasPendingChanges && (
        <div className="flex justify-end gap-2 mb-4 no-print">
          <Button
            variant="outline"
            onClick={handleDiscardChanges}
            disabled={isSubmitting}
          >
            Discard Changes
          </Button>
          <Button
            variant="default"
            className="flex items-center"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save All ({pendingChanges.length})
          </Button>
        </div>
      )}

      {/* Timetable Display */}
      {fetchItemsQuery.isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      ) : selectedClass || selectedTeacher || date ? (
        <div
          ref={timeTableRef}
          className="overflow-x-auto border border-collapse rounded-md  "
        >
          <div className="hidden w-full print:block">
            <h3 className="text-center text-lg font-semibold my-4">
              Time Table - {getCurrentViewTitle}
            </h3>
          </div>
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="border bg-accent sticky left-0 z-10"></TableHead>
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
              {category !== "date"
                ? DAYS.map((day) => (
                  <TableRow key={day} className="hover:bg-accent/50">
                    <TableCell className="border font-medium bg-accent sticky left-0 z-10">
                      <div className="flex items-center gap-2">
                        {day.slice(0, 3)}
                      </div>
                    </TableCell>
                    {periods.map((period) => {
                      const cellData = getCellData(period.periodNumber, day);
                      const markedAttendance = attendanceData.filter(
                        (attendance) =>
                          attendance.periodNumber === period.periodNumber &&
                          attendance.day === day &&
                          (!selectedClass || getStrId(attendance.classId) === getStrId(selectedClass)) &&
                          (!selectedTeacher || getStrId(attendance.teacherId) === getStrId(selectedTeacher)) &&
                          (!cellData?.subjectId || getStrId(attendance.subjectId) === getStrId(cellData.subjectId)) &&
                          (!cellData?.teacherId || getStrId(attendance.teacherId) === getStrId(cellData.teacherId))
                      );
                      const absentees = markedAttendance?.map(
                        (attendance) => ({
                          absentees: attendance?.attendanceData?.filter(
                            (record) => record.present === false
                          ),
                        })
                      );
                      const isPending = isPendingChange(
                        period.periodNumber,
                        day
                      );

                      const leaveReason = leaveRecords.find((record) => {
                        const recordDay = new Date(record.date).toLocaleDateString("en-US", { weekday: "long" });
                        return (
                          getStrId(record.teacherId) === getStrId(cellData?.teacherId) &&
                          record.periodNumber === period.periodNumber &&
                          recordDay === day
                        );
                      })?.leaveReason;

                      return (
                        <TimetableSlot
                          key={`${day}-${period.periodNumber}`}
                          periodNumber={period.periodNumber}
                          day={day}
                          cellData={cellData}
                          category={category}
                          selectedClass={selectedClass}
                          onCellClick={handleCellClick}
                          isAttendanceMarked={false}
                          absentees={[]}
                          showAbsenteesDialog={showAbsenteesDialog}
                          isPendingChange={isPending}
                          leaveReason={null}
                        />
                      );
                    })}
                  </TableRow>
                ))
                : classes.map((classItem) => (
                  <TableRow
                    key={classItem?._id}
                    className="hover:bg-accent/50"
                  >
                    <TableCell className="border font-medium bg-accent sticky left-0 z-10">
                      <div className="flex items-center whitespace-nowrap gap-2">
                        {classItem.name}
                      </div>
                    </TableCell>
                    {periods.map((period) => {
                      const cellData = getCellData(
                        period.periodNumber,
                        day,
                        classItem?._id
                      );
                      const targetDateStr = date;
                      const markedAttendance = attendanceData.filter(
                        (attendance) =>
                          attendance.periodNumber === period.periodNumber &&
                          getStrId(attendance.classId) === getStrId(classItem) &&
                          (!targetDateStr || new Date(attendance.date).toISOString().split('T')[0] === targetDateStr) &&
                          (!cellData?.subjectId || getStrId(attendance.subjectId) === getStrId(cellData.subjectId)) &&
                          (!cellData?.teacherId || getStrId(attendance.teacherId) === getStrId(cellData.teacherId))
                      );
                      const absentees = markedAttendance.map(
                        (attendance) => ({
                          absentees: attendance?.attendanceData?.filter(
                            (record) => record.present === false
                          ),
                        })
                      );
                      const isPending = isPendingChange(
                        period.periodNumber,
                        day,
                        classItem?._id
                      );

                      const leaveReason = leaveRecords.find((record) => {
                        // Check if we are in Date view (no day matching needed as strict date query is used or day is just one day) or Weekly view
                        if (category === "date") {
                          return (
                            getStrId(record.teacherId) === getStrId(cellData?.teacherId) &&
                            record.periodNumber === period.periodNumber
                            // Date filtering already done by API query
                          );
                        }
                        const recordDay = new Date(record.date).toLocaleDateString("en-US", { weekday: "long" });
                        return (
                          getStrId(record.teacherId) === getStrId(cellData?.teacherId) &&
                          record.periodNumber === period.periodNumber &&
                          recordDay === day
                        );
                      })?.leaveReason;

                      return (
                        <TimetableSlot
                          key={`${classItem?._id}-${period.periodNumber}`}
                          periodNumber={period.periodNumber}
                          day={day}
                          cellData={cellData}
                          category={category}
                          selectedClass={selectedClass}
                          onCellClick={handleCellClick}
                          isAttendanceMarked={markedAttendance?.length > 0}
                          absentees={absentees}
                          showAbsenteesDialog={showAbsenteesDialog}
                          isPendingChange={isPending}
                          leaveReason={cellData?.leaveReason || leaveReason}
                        />
                      );
                    })}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center p-8 border rounded-md">
          Please select a class or teacher to view the timetable
        </div>
      )}

      <div className="w-full flex justify-between items-center gap-2 my-4 no-print">
        <div>
          {category === "class" && selectedClass && (
            <ConfirmationPopup
              onClick={handleResetAllTimetables}
              action="reset all classes"
              loading={isSubmitting}
              title={"Reset All Classes Time Table"}
              confirmText="RESET ALL"
              icon={<div className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Reset All Classes</div>}
              triggerClass="bg-red-600 hover:bg-red-700 text-white"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {category === "class" && selectedClass && (
            <ConfirmationPopup
              onClick={handleResetTimetable}
              action="reset"
              loading={isSubmitting}
              title={"Reset Class Time Table"}
              icon="Reset"
            />
          )}
          <Button onClick={handlePrint} className="btn-print">Print</Button>
        </div>
      </div>

      {/* Absentees Dialog */}
      <AbsenteesDialog
        open={absenteesDialogOpen}
        setOpen={setAbsenteesDialogOpen}
        cellData={currentDialogData.cellData}
        day={currentDialogData.day}
        periodNumber={currentDialogData.periodNumber}
        absenteesList={currentAbsenteesList}
      />

      {/* Save Progress Dialog */}
      <SaveProgressDialog
        open={saveProgressOpen}
        progress={saveProgress}
        total={saveTotal}
        completed={saveCompleted}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center text-center gap-2">
              <div>
                {existingTimeSlotId ? "Edit" : "Add"} Time Table Entry
                {selectedPeriod && selectedDay && (
                  <p className="text-sm">
                    {selectedDay} - Period {selectedPeriod} (
                    {getPeriodTime(parseInt(selectedPeriod))})
                  </p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <DialogDescription className="grid md:grid-cols-2 gap-4 text-foreground pt-4">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Subject" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={5}>
                <SelectGroup>
                  <SelectItem value={null}>None</SelectItem>
                  {filteredSubjects.map((subject) => (
                    <SelectItem key={subject?._id} value={subject?._id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={null}>None</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher?._id} value={teacher?._id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </DialogDescription>

          {teacherScheduleConflicts.length > 0 && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Teacher scheduling conflicts:</p>
                {teacherScheduleConflicts.map((conflict, idx) => (
                  <p key={idx} className="text-sm mt-1">
                    {conflict.teacherName} is already teaching{" "}
                    {conflict.subject} for {conflict.class} on {conflict.day}{" "}
                    during period {conflict.period}
                  </p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="mt-4 gap-2">
            <Button
              onClick={handleAddToPendingChanges}
              type="submit"
              disabled={isSubmitting || teacherScheduleConflicts.length > 0}
            >
              Add to Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimeTablesManagements;
