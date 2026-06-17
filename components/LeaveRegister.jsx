"use client";

import useCrud from "@/hooks/use-crud";
import Header from "./Header";
import { useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Clock, User, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const LeaveRegister = ({ apiKey, role, teacherId }) => {
  const [selectedClass, setSelectedClass] = useState("");

  const router = useRouter();

  const { useFetchItems } = useCrud("classes", apiKey);
  const { useFetchItems: useFetchStudents } = useCrud("users", apiKey);
  const { useFetchItems: useFetchLeaveRecords } = useCrud(
    "leave-records",
    apiKey
  );

  const fetchClassQuery = useFetchItems(
    0,
    0,
    {
      ...(role === "Teacher" ? { teacherId: teacherId } : {}),
      projection: "_id,name",
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const fetchStudentsQuery = useFetchStudents(
    0,
    0,
    {
      classId: selectedClass,
      projection: "_id,name,email,profilePic",
      roles: "Student",
      status: "Active",
    },
    {
      enabled: !!selectedClass,
      refetchOnWindowFocus: false,
    }
  );

  const fetchLeaveRecordsQuery = useFetchLeaveRecords(
    0,
    0,
    {
      classId: selectedClass,
      projection:
        "_id,studentId,dateOfLeave,leaveReason,dateOfArrival,arrivedDate,lateReason,remark,createdAt",
    },
    {
      enabled: !!selectedClass,
      refetchOnWindowFocus: false,
    }
  );

  const classes = useMemo(() => {
    return fetchClassQuery.data?.classes || [];
  }, [fetchClassQuery.data]);

  const students = useMemo(() => {
    return fetchStudentsQuery.data?.users || [];
  }, [fetchStudentsQuery.data]);

  const leaveRecords = useMemo(() => {
    return fetchLeaveRecordsQuery.data?.["leave-records"] || [];
  }, [fetchLeaveRecordsQuery.data]);

  const studentLeaveStats = useMemo(() => {
    const stats = {};
    students.forEach((student) => {
      const studentLeaves = leaveRecords.filter(
        (record) => String(record.studentId?._id || record.studentId) === String(student._id)
      );

      const latestRecord = studentLeaves.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )[0];

      // Calculate status based on arrival information
      const recordsWithStatus = studentLeaves.map((record) => {
        let status = "pending";
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        const arrivalDate = new Date(record.dateOfArrival);
        arrivalDate.setHours(0, 0, 0, 0);
        const arrivedDate = record.arrivedDate
          ? new Date(record.arrivedDate)
          : null;

        if (arrivedDate) {
          status = "completed";
        } else if (currentDate > arrivalDate) {
          status = "overdue";
        }

        return { ...record, status };
      });

      const pendingRecords = recordsWithStatus.filter(
        (r) => r.status === "pending"
      );
      const overdueRecords = recordsWithStatus.filter(
        (r) => r.status === "overdue"
      );

      stats[student._id] = {
        totalLeaves: studentLeaves.length,
        latestRecord: latestRecord
          ? {
            ...latestRecord,
            status:
              recordsWithStatus.find((r) => r._id === latestRecord._id)
                ?.status || "pending",
          }
          : null,
        pendingLeaves: pendingRecords.length,
        overdueLeaves: overdueRecords.length,
      };
    });
    return stats;
  }, [students, leaveRecords]);

  useEffect(() => {
    if (role === "Teacher" && classes.length > 0 && !selectedClass) {
      setSelectedClass(classes[0]._id);
    }
  }, [classes, role, selectedClass]);

  const getStatusBadge = (status) => {
    const variants = {
      "Very Good": "default",
      Good: "default",
      Acceptable: "secondary",
      Bad: "destructive",
      "Very Bad": "destructive",
    };

    const labels = {
      "Very Good": "Very Good",
      Good: "Good",
      Acceptable: "Acceptable",
      Bad: "Bad",
      "Very Bad": "Very Bad",
    };

    return (
      <Badge variant={variants[status] || "secondary"} className="text-xs">
        {labels[status] || status || "No Remark"}
      </Badge>
    );
  };

  const calculateDaysOnLeave = (dateOfLeave, arrivedDate, dateOfArrival) => {
    const leaveDate = new Date(dateOfLeave);
    const endDate = arrivedDate
      ? new Date(arrivedDate)
      : new Date(dateOfArrival);
    const diffTime = Math.abs(endDate - leaveDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-4">
      <Header
        title="LEAVE REGISTER"
        subTitle="Manage Leave Records Of Students"
      />

      <div className="flex items-center justify-between gap-3">
        <div className="w-full max-w-[200px] sm:max-w-xs">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full h-9 sm:h-10">
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes?.map((cls) => (
                <SelectItem key={cls._id} value={cls._id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Link href="/dashboard/leave-history">
          <Button size="sm" className="h-9 sm:h-10 whitespace-nowrap">
            <Clock className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Leave Records</span>
            <span className="sm:hidden">Records</span>
          </Button>
        </Link>
      </div>

      {selectedClass && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Card className="p-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="text-xl font-bold">{students.length}</div>
            </CardContent>
          </Card>

          <Card className="p-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
              <CardTitle className="text-sm font-medium">On Leave</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="text-xl font-bold">
                {students.filter(student => {
                  const stats = studentLeaveStats[student._id];
                  return stats && (stats.pendingLeaves > 0 || stats.overdueLeaves > 0);
                }).length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-full overflow-auto border border-border rounded-md whitespace-nowrap ">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">No.</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students?.length > 0 ? (
              [...students]
                .sort((a, b) =>
                  String(a._id).localeCompare(String(b._id), undefined, { numeric: true })
                )
                .map((student, index) => {
                  const stats = studentLeaveStats[student._id] || {};
                  const latestRecord = stats.latestRecord;

                  return (
                    <TableRow
                      key={student._id}
                      className={
                        stats.pendingLeaves > 0 || stats.overdueLeaves > 0
                          ? "bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 border-l-4 border-red-500"
                          : "hover:bg-muted/50"
                      }
                      onClick={() => {
                        router.push(`/dashboard/leave-register/${student._id}`);
                      }}
                    >
                      <TableCell
                        className={`text-center font-medium text-sm ${stats.pendingLeaves > 0 || stats.overdueLeaves > 0
                          ? "text-red-900 dark:text-red-100"
                          : ""
                          }`}
                      >
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-muted">
                            <AvatarImage src={student.profilePic?.url} alt={student.name} />
                            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                              {student.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border">
                                {student._id}
                              </span>
                              <span
                                className={`font-semibold text-xs ${stats.pendingLeaves > 0 || stats.overdueLeaves > 0
                                  ? "text-red-900 dark:text-red-100"
                                  : ""
                                  }`}
                              >
                                {student.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              <span
                                className={`${stats.pendingLeaves > 0 ||
                                  stats.overdueLeaves > 0
                                  ? "text-red-700 dark:text-red-300"
                                  : "text-muted-foreground"
                                  }`}
                              >
                                {stats.totalLeaves || 0}{" "}
                                {stats.totalLeaves <= 1 ? "leave" : "leaves"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-0 py-2">
                        {latestRecord ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {stats.overdueLeaves > 0 && (
                                <Badge variant="destructive" className="text-xs px-1 py-0">
                                  Overdue
                                </Badge>
                              )}
                              {stats.pendingLeaves > 0 && (
                                <Badge variant="destructive" className="text-xs px-1 py-0 bg-orange-500 hover:bg-orange-600">
                                  Pending
                                </Badge>
                              )}
                              {getStatusBadge(latestRecord.remark)}
                            </div>
                            <div
                              className={`text-xs px-2 ${stats.pendingLeaves > 0
                                ? "text-red-700 dark:text-red-300"
                                : "text-muted-foreground"
                                }`}
                            >
                              Days:{" "}
                              {calculateDaysOnLeave(
                                latestRecord.dateOfLeave,
                                latestRecord.arrivedDate,
                                latestRecord.dateOfArrival
                              )}
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`text-sm ${stats.pendingLeaves > 0
                              ? "text-red-700 dark:text-red-300"
                              : "text-muted-foreground"
                              }`}
                          >
                            -
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <div className="space-y-2">
                    <div className="text-muted-foreground">
                      {!!selectedClass
                        ? "No students found for this class."
                        : "Please select a class to view students."}
                    </div>
                    {!!selectedClass && fetchStudentsQuery.isLoading && (
                      <Loader className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

    </div >
  );
};

export default LeaveRegister;
