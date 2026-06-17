"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader, Save, Calendar, Clock, CheckCircle2 } from "lucide-react";

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

// Hooks and Utils
import useCrud from "@/hooks/use-crud";
import { formatDate, formatDateForDisplay } from "@/lib/utils";
import Header from "./Header";
import AbsenteeStatus from "./AbsenteeStatus";

const Attendance = ({ apiKey, teacherId }) => {
  const searchParams = useSearchParams();

  // Extract and memoize query parameters
  const queryParams = useMemo(
    () => ({
      classId: searchParams.get("classId"),
      batchId: searchParams.get("batchId"),
      subjectId: searchParams.get("subjectId"),
      periodNumber: searchParams.get("periodNumber"),
      day: searchParams.get("day"),
    }),
    [searchParams]
  );

  const { classId, batchId, subjectId, periodNumber, day } = queryParams;

  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [classDetails, setClassDetails] = useState(null);
  const [periodDetails, setPeriodDetails] = useState(null);
  const [attendanceExists, setAttendanceExists] = useState(false);
  const [attendanceDate] = useState(formatDate(new Date()));
  const [existingAttendanceId, setExistingAttendanceId] = useState(null);
  const [studentLeaveStatus, setStudentLeaveStatus] = useState({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const today = useMemo(() => formatDateForDisplay(new Date()), []);

  // CRUD hooks with optimized options
  const { useFetchItems: useFetchUsers } = useCrud("users", apiKey);
  const { useFetchItems: useFetchClass } = useCrud("classes", apiKey);
  const { useFetchItems: useFetchPeriod } = useCrud("periods", apiKey);
  const { useFetchItems: useFetchLeaveRecords } = useCrud(
    "leave-records",
    apiKey
  );
  const {
    useFetchItems: useFetchAttendance,
    useAddItem: useCreateAttendance,
    useUpdateItem: useUpdateAttendance,
    useDeleteItem: useDeleteAttendance,
  } = useCrud("attendances", apiKey);

  // Fetch data with appropriate stale times
  const classQuery = useFetchClass(
    null,
    null,
    { _id: classId },
    {
      staleTime: 1000 * 60 * 60, // 1 hour - classes don't change frequently
      enabled: !!classId,
    }
  );

  const periodQuery = useFetchPeriod(
    null,
    null,
    { periodNumber },
    {
      staleTime: 1000 * 60 * 60, // 1 hour - periods are static
      enabled: !!periodNumber,
    }
  );

  const studentsQuery = useFetchUsers(
    0,
    1000,
    {
      roles: ["Student"],
      attendanceClassId: classId,
      status: "Active",
      sort: "asc",
    },
    {
      staleTime: 1000 * 60 * 10, // 10 minutes - students don't change frequently
      enabled: !!classId,
    }
  );

  const attendanceQuery = useFetchAttendance(
    null,
    null,
    {
      classId,
      subjectId,
      periodNumber: parseInt(periodNumber),
      date: attendanceDate,
    },
    {
      staleTime: 1000 * 30, // 30 seconds - attendance changes frequently
      enabled: !!classId && !!subjectId && !!periodNumber,
    }
  );

  // Fetch leave records for students who haven't arrived yet
  const leaveRecordsQuery = useFetchLeaveRecords(
    null,
    null,
    {
      classId,
      isArrived: "false", // Only fetch students who haven't arrived yet
    },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes - leave status changes moderately
      enabled: !!classId,
    }
  );

  // Fetch historical attendance for absentee tracking
  const historicalAttendanceQuery = useFetchAttendance(
    0,
    1000,
    {
      classId,
      batchId,
      subjectId,
      teacherId,
      trackAbsentees: true,
    },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes - historical data is relatively stable
      enabled: !!classId && !!batchId && !!subjectId && !!teacherId,
    }
  );

  // API mutations
  const createAttendance = useCreateAttendance();
  const updateAttendance = useUpdateAttendance();
  const deleteAttendance = useDeleteAttendance();

  // Memoize subject name for performance
  const subjectName = useMemo(() => {
    return classDetails?.subjects?.find((subject) => subject._id === subjectId)
      ?.name;
  }, [classDetails, subjectId]);

  // Process leave records to determine student status
  const processLeaveStatus = useCallback((leaveRecords, studentList) => {
    const leaveStatusMap = {};

    // Initialize all students as present/arrived
    studentList.forEach((student) => {
      leaveStatusMap[student._id] = {
        isOnLeave: false,
        hasArrived: true,
        leaveReason: null,
        expectedArrival: null,
        actualArrival: null,
      };
    });

    // Update status for students who are on leave and haven't arrived
    leaveRecords.forEach((record) => {
      if (
        record.studentId &&
        (!record.arrivedDate || record.arrivedDate === "")
      ) {
        leaveStatusMap[record.studentId] = {
          isOnLeave: true,
          hasArrived: false,
          leaveReason: record.leaveReason,
          expectedArrival: record.dateOfArrival,
          actualArrival: record.arrivedDate,
        };
      }
    });

    return leaveStatusMap;
  }, []);

  // Process leave records effect
  useEffect(() => {
    if (leaveRecordsQuery.data?.["leave-records"] && students.length > 0) {
      const leaveStatus = processLeaveStatus(
        leaveRecordsQuery.data["leave-records"],
        students
      );
      setStudentLeaveStatus(leaveStatus);
    }
  }, [leaveRecordsQuery.data, students, processLeaveStatus]);

  // Process class and period data
  useEffect(() => {
    if (classQuery.data?.classes?.[0]) {
      setClassDetails(classQuery.data.classes[0]);
    }
    if (periodQuery.data?.periods?.[0]) {
      setPeriodDetails(periodQuery.data.periods[0]);
    }
  }, [classQuery.data, periodQuery.data]);

  // Initialize attendance based on student list and leave status
  const initializeAttendance = useCallback((studentList, leaveStatusMap) => {
    const initialAttendance = {};

    studentList.forEach((student) => {
      const leaveInfo = leaveStatusMap[student._id];
      // Mark as absent if student is on leave and hasn't arrived
      initialAttendance[student._id] = !(
        leaveInfo?.isOnLeave && !leaveInfo?.hasArrived
      );
    });

    return initialAttendance;
  }, []);

  // Process student data and initialize attendance
  useEffect(() => {
    if (studentsQuery.data?.users?.length > 0) {
      const studentsList = studentsQuery.data.users;
      setStudents(studentsList);

      // Initialize attendance if it's empty
      if (Object.keys(attendance).length === 0) {
        const initialAttendance = initializeAttendance(
          studentsList,
          studentLeaveStatus || {}
        );
        setAttendance(initialAttendance);
      }
      // If we have unsaved attendance and leave status updates, apply leave overrides
      else if (!attendanceExists && Object.keys(studentLeaveStatus).length > 0) {
        setAttendance(prev => {
          const next = { ...prev };
          let changed = false;
          studentsList.forEach(student => {
            const leaveInfo = studentLeaveStatus[student._id];
            if (leaveInfo?.isOnLeave && !leaveInfo?.hasArrived && next[student._id] !== false) {
              next[student._id] = false;
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      }
    }
  }, [
    studentsQuery.data,
    studentLeaveStatus,
    initializeAttendance,
    attendanceExists
  ]);

  // Process existing attendance data
  useEffect(() => {
    if (attendanceQuery.data?.attendances?.length > 0) {
      const attendanceRecord = attendanceQuery.data.attendances[0];
      setAttendanceExists(true);
      setExistingAttendanceId(attendanceRecord._id);

      // Update attendance state with existing data
      if (attendanceRecord.attendanceData?.length > 0) {
        const existingAttendance = {};
        attendanceRecord.attendanceData.forEach((item) => {
          existingAttendance[item.studentId] = item.present;
        });
        setAttendance(existingAttendance);
      }
    } else {
      setAttendanceExists(false);
      setExistingAttendanceId(null);
    }
  }, [attendanceQuery.data]);

  // Manage loading state
  useEffect(() => {
    const isLoading =
      classQuery.isLoading ||
      periodQuery.isLoading ||
      studentsQuery.isLoading ||
      attendanceQuery.isLoading ||
      leaveRecordsQuery.isLoading;

    setLoading(isLoading);
  }, [
    classQuery.isLoading,
    periodQuery.isLoading,
    studentsQuery.isLoading,
    attendanceQuery.isLoading,
    leaveRecordsQuery.isLoading,
  ]);
  
  // Auto-redirect after successful save
  useEffect(() => {
    if (showSuccessDialog) {
      const timer = setTimeout(() => {
        window.location.href = "/dashboard/my-periods";
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessDialog]);

  // Memoize absentee data processing
  const absenteeData = useMemo(() => {
    if (
      !historicalAttendanceQuery.data?.attendances?.absenteeTracking ||
      !students.length
    ) {
      return [];
    }
    return historicalAttendanceQuery.data.attendances.absenteeTracking;
  }, [historicalAttendanceQuery.data, students]);

  // Memoize filtered students based on subject type assignments
  const filteredStudents = useMemo(() => {
    if (!students.length || !classDetails || !subjectId) return students;

    const isCore = (classDetails.coreSubjects || []).some(
      (s) => (typeof s === "object" ? s._id : s) === subjectId
    );
    const isMajor = (classDetails.majorSubjects || []).some(
      (s) => (typeof s === "object" ? s._id : s) === subjectId
    );

    return students.filter((student) => {
      const assignments = student.subjectTypeAssignments || [];
      const studentClassId = student.studentSpecificField?.classId || student.classId;

      // 1. If student is assigned specifically to this class:type, include them
      if (isCore && assignments.includes(`${classId}:CORE`)) return true;
      if (isMajor && assignments.includes(`${classId}:MAJOR`)) return true;

      // 2. If student belongs to this class and NO assignments are specified for this type, include them by default
      const hasCoreAssignment = assignments.some(a => a.endsWith(':CORE'));
      const hasMajorAssignment = assignments.some(a => a.endsWith(':MAJOR'));

      if (studentClassId === classId) {
        if (isCore && !hasCoreAssignment) return true;
        if (isMajor && !hasMajorAssignment) return true;
      }

      // 3. Backward compatibility: if no assignments at all, show for both by default
      if (assignments.length === 0) return true;

      // 4. If the subject is neither core nor major in this class, show everyone from the primary class
      if (!isCore && !isMajor) return true;

      return false;
    }).sort((a, b) => {
      const idA = a.studentSpecificField?.admissionNumber || a.admissionNumber || a._id;
      const idB = b.studentSpecificField?.admissionNumber || b.admissionNumber || b._id;
      return String(idA).localeCompare(String(idB), undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [students, classDetails, subjectId, classId]);

  // Memoize attendance toggle handler
  const toggleAttendance = useCallback((studentId) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  }, []);

  // Memoize attendance statistics
  const attendanceStats = useMemo(() => {
    const total = filteredStudents.length;
    const present = filteredStudents.filter(st => attendance[st._id]).length;
    const absent = total - present;
    const presentPercentage =
      total > 0 ? Math.round((present / total) * 100) : 0;
    const absentPercentage = total > 0 ? Math.round((absent / total) * 100) : 0;

    return { total, present, absent, presentPercentage, absentPercentage };
  }, [filteredStudents, attendance]);

  // Memoize absentee info lookup
  const getStudentAbsenteeInfo = useCallback(
    (studentId) =>
      absenteeData.find((student) => student.studentId === studentId),
    [absenteeData]
  );

  // Determine row styling based on student status
  const getRowStyling = useCallback(
    (studentId, isPresent) => {
      const leaveInfo = studentLeaveStatus[studentId];

      if (isPresent) {
        return { className: "hover:bg-muted/50", textColor: "" };
      }

      // Student is absent - check leave status
      if (leaveInfo?.isOnLeave && !leaveInfo?.hasArrived) {
        return {
          className:
            "bg-red-100 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-950",
          textColor: "text-red-900 dark:text-red-100",
        };
      }

      // Regular absent student
      return {
        className:
          "bg-rose-50 dark:bg-rose-950 hover:bg-rose-50 dark:hover:bg-rose-950",
        textColor: "text-rose-900 dark:text-rose-100",
      };
    },
    [studentLeaveStatus]
  );

  // Handle save attendance
  const handleSaveAttendance = useCallback(async () => {
    if (saving) return;

    try {
      setSaving(true);

      const attendanceData = filteredStudents.map((student) => ({
        studentId: student._id,
        present: attendance[student._id] ?? false,
      }));

      const payload = {
        classId,
        batchId,
        subjectId,
        teacherId,
        periodNumber: parseInt(periodNumber),
        day,
        date: attendanceDate,
        attendanceData,
      };

      if (attendanceExists && existingAttendanceId) {
        await updateAttendance.mutateAsync({
          data: { _id: existingAttendanceId, ...payload },
        });
        setSuccessMessage("Attendance Updated Successfully!");
        setShowSuccessDialog(true);
      } else {
        await createAttendance.mutateAsync(payload);
        setSuccessMessage("Attendance Saved Successfully!");
        setShowSuccessDialog(true);
        setAttendanceExists(true);
      }
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error(`Failed to save attendance: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    filteredStudents,
    attendance,
    classId,
    batchId,
    subjectId,
    teacherId,
    periodNumber,
    day,
    attendanceDate,
    attendanceExists,
    existingAttendanceId,
    updateAttendance,
    createAttendance,
  ]);

  // Handle delete attendance
  const handleDeleteAttendance = useCallback(async () => {
    if (saving || !attendanceExists || !existingAttendanceId) return;

    try {
      setSaving(true);
      await deleteAttendance.mutateAsync({
        data: { ids: [existingAttendanceId] },
      });
      setSuccessMessage("Attendance Reset Successfully!");
      setShowSuccessDialog(true);

      setAttendanceExists(false);
      setExistingAttendanceId(null);

      // Reset attendance based on leave status
      const resetAttendance = initializeAttendance(
        filteredStudents,
        studentLeaveStatus
      );
      setAttendance(resetAttendance);
    } catch (error) {
      console.error("Error resetting attendance:", error);
      toast.error(`Failed to reset attendance: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    attendanceExists,
    existingAttendanceId,
    deleteAttendance,
    students,
    studentLeaveStatus,
    initializeAttendance,
  ]);

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <Header
          title="ATTENDANCE MANAGEMENT"
          subTitle="Loading attendance data..."
        />
        <div className="flex justify-center items-center h-40">
          <Loader className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Metadata */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <div className="flex-1 -mb-4 md:mb-0">
          <Header
            title="ATTENDANCE MANAGEMENT"
            subTitle={`Mark Attendance For ${classDetails?.name} - ${subjectName}`}
          />
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-muted-foreground px-3 md:px-0 pb-2 md:pb-0">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">{today}</span>
          </div>
          <div className="h-4 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Period {periodNumber}: {periodDetails?.formattedTime}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="border border-border rounded-lg p-2 md:p-4 bg-card/30">
        <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
          <div className="flex flex-col items-center gap-1 md:gap-2">
            <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate w-full">
              Total
            </span>
            <div className="w-full max-w-[70px] md:max-w-[90px] py-1 md:py-1.5 rounded-lg border border-border bg-background text-base md:text-xl font-bold shadow-sm flex items-center justify-center">
              {attendanceStats.total}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 md:gap-2">
            <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate w-full">
              Present
            </span>
            <div className="w-full max-w-[70px] md:max-w-[90px] py-1 md:py-1.5 rounded-lg border border-border bg-background text-base md:text-xl font-bold shadow-sm flex items-center justify-center">
              {attendanceStats.present}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 md:gap-2">
            <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate w-full">
              Absent
            </span>
            <div className="w-full max-w-[70px] md:max-w-[90px] py-1 md:py-1.5 rounded-lg bg-red-500 text-white text-base md:text-xl font-bold shadow-sm flex items-center justify-center">
              {attendanceStats.absent}
            </div>
          </div>
        </div>
      </div>


      {/* Students Table */}
      <div className="overflow-x-auto max-h-[calc(100vh-415px)] md:max-h-[calc(100vh-339px)] border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">R.no</TableHead>
              <TableHead>Students</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[70px]">History</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student, index) => {
                const absenteeInfo = getStudentAbsenteeInfo(student._id);
                const hasAbsenceHistory = absenteeInfo?.continuousAbsences > 0;
                const isPresent = attendance[student._id];
                const rowStyling = getRowStyling(student._id, isPresent);
                const leaveInfo = studentLeaveStatus[student._id];

                return (
                  <TableRow
                    key={student._id}
                    className={`cursor-pointer ${rowStyling.className}`}
                    onClick={() => toggleAttendance(student._id)}
                  >
                    <TableCell className={rowStyling.textColor}>
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={student.profilePic?.url} />
                          <AvatarFallback>
                            {student.name.substring(0, 1)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p
                            className={`font-medium text-xs ${rowStyling.textColor}`}
                          >
                            {student.name}
                          </p>
                          <p
                            className={`text-xs ${rowStyling.textColor || "text-muted-foreground"}`}
                          >
                            {student._id}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {leaveInfo?.isOnLeave && !leaveInfo?.hasArrived && (
                        <div className="flex flex-col gap-1">
                          <Badge variant="destructive" className="text-xs w-fit">
                            On Leave
                          </Badge>
                          <span className="text-[10px] font-medium text-red-600 dark:text-red-400">
                            {leaveInfo.leaveReason}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasAbsenceHistory && (
                        <AbsenteeStatus absenteeInfo={absenteeInfo} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  No students found in this class
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleDeleteAttendance}
          disabled={!attendanceExists || saving}
        >
          {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          Reset
        </Button>
        <Button
          onClick={handleSaveAttendance}
          disabled={saving || !filteredStudents.length}
        >
          {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {attendanceExists ? "Update" : "Save"}
        </Button>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="w-[90%] sm:w-full sm:max-w-md rounded-xl">
          <DialogHeader className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
              Successful
            </DialogTitle>
            <DialogDescription className="text-lg">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Attendance;
