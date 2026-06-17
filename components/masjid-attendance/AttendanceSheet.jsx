"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader, Save, ArrowLeft, Clock } from "lucide-react";
import useCrud from "@/hooks/use-crud";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const AttendanceSheet = ({
    classId,
    className,
    batchId,
    prayer,
    date,
    apiKey,
    user,
    sessionLabel,
}) => {
    const router = useRouter();
    const [attendance, setAttendance] = useState({});
    const [saving, setSaving] = useState(false);
    const [existingRecordId, setExistingRecordId] = useState(null);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);

    // Fetch students
    const { useFetchItems: useFetchStudents } = useCrud("users", apiKey);
    const studentsQuery = useFetchStudents(
        0,
        0,
        {
            classId,
            roles: "Student",
            status: "Active",
        },
        {
            staleTime: 1000 * 60 * 10,
        }
    );

    const students = useMemo(() => {
        const list = studentsQuery.data?.users || [];
        return [...list].sort((a, b) => {
            const idA = a.studentSpecificField?.admissionNumber || a.admissionNumber || a._id;
            const idB = b.studentSpecificField?.admissionNumber || b.admissionNumber || b._id;
            return String(idA).localeCompare(String(idB), undefined, { numeric: true });
        });
    }, [studentsQuery.data]);

    // Fetch existing attendance for current day/prayer
    const {
        useFetchItems: useFetchAttendance,
        useAddItem: useSaveAttendance,
        useUpdateItem: useUpdateAttendance,
        useDeleteItem: useDeleteAttendance,
    } = useCrud("masjid/attendance", apiKey);

    const attendanceQuery = useFetchAttendance(
        0,
        0,
        {
            date,
            prayer,
            classId,
        },
        {
            refetchOnMount: true,
        }
    );

    // Fetch leave records for the class to identify students on leave
    const { useFetchItems: useFetchLeaveRecords } = useCrud("leave-records", apiKey);
    const leaveRecordsQuery = useFetchLeaveRecords(
        0,
        0,
        {
            classId,
            projection: "studentId,dateOfLeave,arrivedDate",
        },
        {
            refetchOnMount: true,
        }
    );

    const studentsOnLeave = useMemo(() => {
        if (!leaveRecordsQuery.data?.["leave-records"]) return {};

        const onLeaveMap = {};
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        leaveRecordsQuery.data["leave-records"].forEach((record) => {
            if (!record.studentId) return;

            const studentId = record.studentId._id || record.studentId;
            const leaveDate = new Date(record.dateOfLeave);
            leaveDate.setHours(0, 0, 0, 0);

            // Check if student is on leave for the attendance date
            // Condition: Leave started on or before attendance date
            // AND (Not arrived yet OR Arrived AFTER attendance date)
            if (leaveDate <= attendanceDate) {
                if (!record.arrivedDate) {
                    onLeaveMap[studentId] = true;
                } else {
                    const arrivedDate = new Date(record.arrivedDate);
                    arrivedDate.setHours(0, 0, 0, 0);
                    if (arrivedDate > attendanceDate) {
                        onLeaveMap[studentId] = true;
                    }
                }
            }
        });

        return onLeaveMap;
    }, [leaveRecordsQuery.data, date]);

    // Fetch ALL historical attendance for this class to calculate stats
    // Note: This might be heavy if there are many records. 
    // Ideally, the backend should provide stats, but we are doing it client-side as per request.
    const historyQuery = useFetchAttendance(
        0,
        0,
        {
            classId,
        },
        {
            staleTime: 1000 * 60 * 5,
        }
    );

    // Calculate absent days per student
    const studentHistory = useMemo(() => {
        if (!historyQuery.data?.attendances) return {};

        const historyMap = {};

        // Initialize for all current students
        students.forEach(s => {
            historyMap[s._id] = 0;
        });

        historyQuery.data.attendances.forEach(record => {
            record.attendanceData.forEach(item => {
                const studentId = item.studentId._id || item.studentId;
                if (item.status === "ABSENT" || item.status === "LEAVE") {
                    historyMap[studentId] = (historyMap[studentId] || 0) + 1;
                }
            });
        });

        return historyMap;
    }, [historyQuery.data, students]);


    useEffect(() => {
        // Wait for leave records to load before initializing logic that depends on them
        if (leaveRecordsQuery.isLoading) return;

        if (attendanceQuery.data?.attendances?.length > 0) {
            const record = attendanceQuery.data.attendances[0];
            setExistingRecordId(record._id);

            const initialAttendance = {};
            record.attendanceData.forEach((item) => {
                initialAttendance[item.studentId._id || item.studentId] =
                    item.status === "PRESENT";
            });
            setAttendance(initialAttendance);
        } else if (students.length > 0 && Object.keys(attendance).length === 0) {
            // Initialize:
            // - Normal students: Present (true)
            // - Leave students: Absent/Leave (false)
            const initialAttendance = {};
            students.forEach((student) => {
                const isOnLeave = studentsOnLeave[student._id];
                initialAttendance[student._id] = !isOnLeave; // Default false (absent) if on leave, true otherwise
            });
            setAttendance(initialAttendance);
        }
    }, [attendanceQuery.data, students, studentsOnLeave, leaveRecordsQuery.isLoading]);

    const toggleAttendance = (studentId) => {
        // Toggle is now allowed for EVERYONE including leave students
        setAttendance((prev) => ({
            ...prev,
            [studentId]: !prev[studentId],
        }));
    };

    const saveAttendance = useSaveAttendance();
    const updateAttendance = useUpdateAttendance();
    const deleteAttendance = useDeleteAttendance();

    const handleSave = async () => {
        setSaving(true);
        try {
            const attendanceData = students.map((student) => {
                const isLeave = studentsOnLeave[student._id];
                const isPresent = attendance[student._id];

                let status = "ABSENT";
                if (isPresent) {
                    status = "PRESENT"; // If marked present, it overrides leave
                } else if (isLeave) {
                    status = "LEAVE"; // If absent and on leave, status is LEAVE
                } else {
                    status = "ABSENT"; // If absent and not on leave
                }

                return {
                    studentId: student._id,
                    status,
                };
            });

            const payload = {
                date,
                day: new Date(date).toLocaleDateString("en-US", { weekday: "long" }),
                prayer,
                classId,
                batchId,
                markedBy: user._id,
                attendanceData,
            };

            await saveAttendance.mutateAsync(payload);
            toast.success("Attendance saved successfully");
            // Navigate back to dashboard with expanded state
            router.push(`/dashboard/masjid-attendance?expanded=${prayer}`);
        } catch (error) {
            console.error("Error saving attendance:", error);
            toast.error("Failed to save attendance");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!existingRecordId) return;

        setSaving(true);
        try {
            await deleteAttendance.mutateAsync({ data: { ids: [existingRecordId] } });
            toast.success("Attendance reset successfully");
            setResetDialogOpen(false);
            router.push(`/dashboard/masjid-attendance?expanded=${prayer}`);
        } catch (error) {
            console.error("Error resetting attendance:", error);
            toast.error("Failed to reset attendance");
        } finally {
            setSaving(false);
        }
    };

    const stats = useMemo(() => {
        const total = students.length;
        let present = 0;
        let absent = 0;

        students.forEach(student => {
            // If attendance is true -> Present
            // If attendance is false -> Absent (regardless of leave status)
            if (attendance[student._id]) {
                present++;
            } else {
                absent++;
            }
        });

        return { total, present, absent };
    }, [students, attendance]);

    if (studentsQuery.isLoading || attendanceQuery.isLoading || leaveRecordsQuery.isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20 md:pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/masjid-attendance?expanded=${prayer}`)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">
                            MARK ATTENDANCE
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {sessionLabel && sessionLabel !== "General" ? `${sessionLabel} · ` : ""}{prayer} - {className}
                        </p>
                    </div>
                </div>
                {/* Date Display - Right side, styled like MyPeriods */}
                <div className="py-1 px-8 border border-border rounded-lg text-sm font-medium self-start md:self-auto">
                    {date}
                </div>
            </div>

            {/* Stats Card - Sticky on Mobile */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 -mx-4 px-4 md:static md:bg-transparent md:p-0 md:mx-0">
                <div className="flex flex-col md:flex-row items-center justify-between bg-card p-4 rounded-lg border shadow-sm gap-4">
                    <div className="flex w-full md:w-auto justify-between md:justify-start gap-2 md:gap-4 flex-wrap">
                        <div className="flex flex-col items-center md:flex-row md:gap-2">
                            <span className="text-xs text-muted-foreground uppercase font-bold md:hidden">
                                Total
                            </span>
                            <Badge variant="outline" className="text-sm md:text-base py-1 px-3">
                                <span className="hidden md:inline mr-1">Total:</span>
                                {stats.total}
                            </Badge>
                        </div>
                        <div className="flex flex-col items-center md:flex-row md:gap-2">
                            <span className="text-xs text-muted-foreground uppercase font-bold md:hidden">
                                Present
                            </span>
                            <Badge variant="success" className="text-sm md:text-base py-1 px-3">
                                <span className="hidden md:inline mr-1">Present:</span>
                                {stats.present}
                            </Badge>
                        </div>
                        <div className="flex flex-col items-center md:flex-row md:gap-2">
                            <span className="text-xs text-muted-foreground uppercase font-bold md:hidden">
                                Absent
                            </span>
                            <Badge
                                variant="destructive"
                                className="text-sm md:text-base py-1 px-3"
                            >
                                <span className="hidden md:inline mr-1">Absent:</span>
                                {stats.absent}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">Sl No</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead className="w-[100px] text-right md:text-center">History</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map((student, index) => {
                            const isOnLeave = studentsOnLeave[student._id];
                            const isPresent = attendance[student._id];

                            // Visual state determination
                            let rowClass = "hover:bg-transparent";

                            // If present, show normal style even if on leave (user overrode it)
                            // If NOT present:
                            //   If on Leave -> Red with Indicator
                            //   If not on Leave -> Red Normal
                            if (isPresent) {
                                rowClass = "cursor-pointer";
                            } else {
                                if (isOnLeave) {
                                    // Red background for leave, border to distinguish "Explained Absence"
                                    rowClass = "bg-red-50/80 dark:bg-red-950/30 cursor-pointer border-l-4 border-l-yellow-500";
                                } else {
                                    rowClass = "bg-red-50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer";
                                }
                            }

                            return (
                                <TableRow
                                    key={student._id}
                                    className={rowClass}
                                    onClick={() => toggleAttendance(student._id)}
                                >
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 hidden sm:block">
                                                <AvatarImage src={student.profilePic?.url} />
                                                <AvatarFallback>
                                                    {student.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm md:text-base">
                                                    {student.name}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-muted-foreground">
                                                        {student.admissionNumber}
                                                    </p>
                                                    {isOnLeave && (
                                                        <Badge variant="outline" className="h-4 text-[10px] px-1 bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-500 dark:border-yellow-800">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            On Leave
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right md:text-center">
                                        {/* History Column - Shows absent days count */}
                                        <div className="flex flex-col items-end md:items-center">
                                            <span className="text-sm font-bold text-muted-foreground">
                                                {studentHistory[student._id] || 0}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground uppercase">
                                                Days Absent
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {students.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={3}
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    No students found in this class.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Floating Action Bar - Fixed at bottom for ALL screens as requested */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-end gap-2 z-20">
                <div className="container max-w-7xl mx-auto flex justify-end gap-2 w-full">
                    {existingRecordId && (
                        <Button
                            variant="outline"
                            className="border-destructive text-destructive hover:bg-destructive/10"
                            onClick={() => setResetDialogOpen(true)}
                            disabled={saving}
                        >
                            Reset
                        </Button>
                    )}
                    <Button
                        className="w-full sm:w-auto"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        {existingRecordId ? "Update Attendance" : "Save Attendance"}
                    </Button>
                </div>
            </div>

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Attendance?</DialogTitle>
                        <DialogDescription>
                            This will remove the attendance record for this class. All students
                            will be marked as pending. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setResetDialogOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReset}
                            disabled={saving}
                        >
                            {saving && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                            Yes, Reset Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AttendanceSheet;
