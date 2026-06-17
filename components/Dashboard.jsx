"use client";

import {
  useState,
  useEffect,
  useMemo,
  memo,
  Suspense,
  useCallback,
} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserCheck,
  BookOpen,
  GraduationCap,
  BarChart3,
  Calendar,
  AlertCircle,
  BarChart,
  Loader,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart as RechartsBarChart,
  Bar,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";
import Image from "next/image";
import { useRouter } from "next/navigation";

import useCrud from "@/hooks/use-crud";
import Header from "@/components/Header";
import TimeTableComponent from "@/components/TimeTableComponent";
import LiteraryStudentLookup from "./LiteraryStudentLookup";
import LiterarySummaryCard from "./LiterarySummaryCard";
import { formatDateForDisplay, sortClasses } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ===== CUSTOM HOOKS =====
const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};

// ===== UTILITY FUNCTIONS =====
/**
 * Calculates attendance percentage from attendance records
 * @param {Array} attendanceRecords - List of attendance records
 * @returns {Object} Object containing attendance statistics
 */
const calculateAttendancePercentage = (attendanceRecords) => {
  if (!attendanceRecords?.length) {
    return { totalMarked: 0, totalPresent: 0, percentage: 0 };
  }

  const { totalMarked, totalPresent } = attendanceRecords.reduce(
    (acc, record) => {
      const students = record.attendanceData || [];
      acc.totalMarked += students.length;
      acc.totalPresent += students.filter((s) => s.present).length;
      return acc;
    },
    { totalMarked: 0, totalPresent: 0 }
  );

  const percentage =
    totalMarked > 0
      ? parseFloat(((totalPresent / totalMarked) * 100).toFixed(2))
      : 0;

  return { totalMarked, totalPresent, percentage };
};

// ===== LOADING COMPONENTS =====
const StatCardSkeleton = memo(() => (
  <Card
    className="overflow-hidden border-l-4 border-l-muted"
    role="status"
    aria-label="Loading statistics"
  >
    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/10">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton className="h-12 w-12 rounded-full" />
    </CardHeader>
    <CardContent className="pt-3 pb-4">
      <Skeleton className="h-3 w-32" />
    </CardContent>
  </Card>
));
StatCardSkeleton.displayName = "StatCardSkeleton";

const StatsOverviewSkeleton = memo(() => (
  <div className="grid gap-4 xs:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }, (_, i) => (
      <StatCardSkeleton key={i} />
    ))}
  </div>
));
StatsOverviewSkeleton.displayName = "StatsOverviewSkeleton";

const ChartSkeleton = memo(({ height = "300px" }) => (
  <div
    className={`h-[${height}] bg-muted/10 rounded-lg flex items-center justify-center`}
    role="status"
    aria-label="Loading chart"
  >
    <Loader className="h-8 w-8 text-muted-foreground animate-spin" />
  </div>
));
ChartSkeleton.displayName = "ChartSkeleton";

const ClassCardSkeleton = memo(() => (
  <Card
    className="overflow-hidden"
    role="status"
    aria-label="Loading class information"
  >
    <CardHeader className="pb-2 bg-muted/30">
      <Skeleton className="h-5 w-24 mb-1" />
      <Skeleton className="h-3 w-32" />
    </CardHeader>
    <CardContent className="pt-4">
      <div className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-6" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-6" />
        </div>
        <div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-2 w-full mt-1" />
        </div>
      </div>
    </CardContent>
  </Card>
));
ClassCardSkeleton.displayName = "ClassCardSkeleton";

const ClassesSkeleton = memo(() => (
  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }, (_, i) => (
      <ClassCardSkeleton key={i} />
    ))}
  </div>
));
ClassesSkeleton.displayName = "ClassesSkeleton";

// ===== MAIN COMPONENTS =====
const StatCard = memo(({ title, value, icon: Icon, description, onClick, clickLabel }) => (
  <Card
    className={`overflow-hidden hover:shadow-md transition-shadow duration-300 border-l-4 border-l-primary${onClick ? " cursor-pointer active:scale-[0.98]" : ""}`}
    role="region"
    aria-labelledby={`stat-${title}`}
    onClick={onClick}
  >
    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/10">
      <div className="space-y-1">
        <CardTitle id={`stat-${title}`} className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className="text-3xl font-bold tracking-tight"
          aria-describedby={`stat-${title}-desc`}
        >
          {value}
        </div>
      </div>
      <div className="p-3 bg-primary/10 rounded-full">
        <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
      </div>
    </CardHeader>
    <CardContent className="pt-3 pb-4">
      {description && (
        <p
          id={`stat-${title}-desc`}
          className="text-xs text-muted-foreground"
        >
          {description}
        </p>
      )}
      {onClick && (
        <p className="text-xs text-primary font-medium mt-1">{clickLabel || "Click to view details →"}</p>
      )}
    </CardContent>
  </Card>
));
StatCard.displayName = "StatCard";

const ErrorAlert = memo(({ message }) => (
  <Alert variant="destructive" className="mb-6" role="alert">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>{message}</AlertDescription>
  </Alert>
));
ErrorAlert.displayName = "ErrorAlert";

// ===== CLASS CARD COMPONENT =====
const ClassCard = memo(
  ({ classData, students, batches, attendances, leaveStudents }) => {
    const [activeOpen, setActiveOpen] = useState(false);
    const [leaveOpen, setLeaveOpen] = useState(false);

    const { classStudentsList, classBatch, attendanceStats } = useMemo(() => {
      const filteredStudents =
        students?.filter((student) => {
          const studentClassId =
            student.studentSpecificField?.classId?._id ||
            student.studentSpecificField?.classId ||
            student.classId?._id ||
            student.classId;
          const studentBatchId =
            student.studentSpecificField?.batchId?._id ||
            student.studentSpecificField?.batchId ||
            student.batchId?._id ||
            student.batchId;
          const targetBatchId = classData.batchId?._id || classData.batchId;
          
          const studentStatus = student.studentSpecificField?.status || student.status;

          // If classId is available, it uniquely identifies the class.
          // If not, fallback to matching both className and batchId.
          const isClassMatch = studentClassId 
            ? String(studentClassId) === String(classData._id)
            : (student.className === classData.name && String(studentBatchId) === String(targetBatchId));

          return (
            isClassMatch &&
            studentStatus === "Active"
          );
        }) || [];

      const sortedStudents = [...filteredStudents].sort((a, b) => {
        const idA = a.studentSpecificField?.admissionNumber || a.admissionNumber || a._id;
        const idB = b.studentSpecificField?.admissionNumber || b.admissionNumber || b._id;
        return String(idA).localeCompare(String(idB), undefined, { numeric: true });
      });

      const foundBatch = batches?.find(
        (batch) => String(batch._id) === String(classData.batchId?._id || classData.batchId)
      );

      const filteredAttendance =
        attendances?.filter(
          (attendance) => attendance.classId?._id === classData._id
        ) || [];

      const stats = calculateAttendancePercentage(filteredAttendance);

      return {
        classStudentsList: sortedStudents,
        classBatch: foundBatch,
        attendanceStats: stats,
      };
    }, [classData, students, batches, attendances]);

    const sortedLeaveStudents = useMemo(() => {
      return [...(leaveStudents || [])].sort((a, b) => {
        const idA = a.studentId?._id || a.studentId || "";
        const idB = b.studentId?._id || b.studentId || "";
        return String(idA).localeCompare(String(idB), undefined, { numeric: true });
      });
    }, [leaveStudents]);

    const presentStudents = classStudentsList.length - (leaveStudents?.length || 0);

    return (
      <>
        <Card
          className="overflow-hidden hover:border-primary/50 transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-primary"
          role="region"
          aria-labelledby={`class-${classData._id}`}
        >
          <CardHeader 
            className="pb-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors duration-200 group/header"
            onClick={() => setActiveOpen(true)}
          >
            <div className="flex justify-between items-start">
              <div>
                <CardTitle id={`class-${classData._id}`} className="text-lg group-hover/header:text-primary transition-colors">
                  {classData.name}
                </CardTitle>
                <CardDescription className="group-hover/header:text-primary/80 transition-colors">
                  {classBatch
                    ? `${classBatch.name} (${classBatch.academicYear})`
                    : "N/A"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-sm space-y-3">
              <div 
                className="flex justify-between items-center hover:bg-muted/60 hover:text-primary cursor-pointer p-1.5 rounded-md transition-all group"
                onClick={() => setActiveOpen(true)}
              >
                <span className="text-muted-foreground group-hover:text-primary font-medium">Students:</span>
                <span className="font-semibold text-primary underline decoration-dotted group-hover:underline group-hover:scale-105 transition-all">
                  {classStudentsList.length}
                </span>
              </div>
              <div className="flex justify-between items-center p-1.5">
                <span className="text-muted-foreground font-medium">Present:</span>
                <span className="font-semibold">{presentStudents}</span>
              </div>
              <div 
                className="flex justify-between items-center hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 cursor-pointer p-1.5 rounded-md transition-all group"
                onClick={() => setLeaveOpen(true)}
              >
                <span className="text-muted-foreground group-hover:text-red-500 font-medium">On Leave:</span>
                <span className="font-semibold text-red-500 underline decoration-dotted group-hover:underline group-hover:scale-105 transition-all">
                  {leaveStudents.length}
                </span>
              </div>
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Today's Attendance:
                  </span>
                  <span className="font-medium">
                    {attendanceStats.percentage}%
                  </span>
                </div>
                <Progress
                  value={attendanceStats.percentage}
                  className="h-1"
                  aria-label={`Attendance: ${attendanceStats.percentage}%`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Students Popup */}
        <Dialog open={activeOpen} onOpenChange={setActiveOpen}>
          <DialogContent className="max-w-md max-h-[75vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-xl font-bold">
                <Users className="h-5 w-5 text-primary" />
                <span>Active Students - {classData.name}</span>
              </DialogTitle>
              <DialogDescription>
                List of all active students in {classData.name} ({classStudentsList.length} students)
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm border rounded-md p-2 max-h-80 overflow-y-auto bg-muted/10 space-y-1 flex-1">
              {classStudentsList.length > 0 ? (
                classStudentsList.map((student, index) => (
                  <div key={student._id} className="flex justify-between items-center py-2 px-3 border-b last:border-0 hover:bg-muted/50 rounded transition-colors">
                    <div className="font-semibold text-slate-700 dark:text-slate-200">
                      {index + 1}. {student.name}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground bg-white dark:bg-slate-900 border px-2 py-0.5 rounded shadow-sm">
                      {student._id}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-center py-6">No active students found</div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Leave Students Popup */}
        <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
          <DialogContent className="max-w-md max-h-[75vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-xl font-bold">
                <Users className="h-5 w-5 text-red-500" />
                <span>On Leave Students - {classData.name}</span>
              </DialogTitle>
              <DialogDescription>
                Students on leave today in {classData.name} ({sortedLeaveStudents.length} students)
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm border rounded-md p-2 max-h-80 overflow-y-auto bg-muted/10 space-y-1 flex-1">
              {sortedLeaveStudents.length > 0 ? (
                sortedLeaveStudents.map((std, index) => {
                  const student = students?.find(s => String(s._id) === String(std.studentId?._id || std.studentId));
                  const admissionNumber = student?.studentSpecificField?.admissionNumber || student?.admissionNumber || "";
                  const leaveReason = std.reason || std.leaveReason || "";
                  const displayId = std.studentId?._id || std.studentId || "";
                  return (
                    <div key={index} className="flex justify-between items-center py-2 px-3 border-b last:border-0 hover:bg-muted/50 rounded transition-colors">
                      <div className="flex flex-col">
                        <div className="font-semibold text-red-600 dark:text-red-400">
                          {index + 1}. {std.studentName} {admissionNumber ? `(${admissionNumber})` : ""}
                        </div>
                        {leaveReason && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {leaveReason}
                          </div>
                        )}
                      </div>
                      {displayId && (
                        <div className="text-xs font-mono text-muted-foreground bg-white dark:bg-slate-900 border px-2 py-0.5 rounded shadow-sm h-fit">
                          {displayId}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-muted-foreground text-center py-6">No students on leave today</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);
ClassCard.displayName = "ClassCard";

// ===== STATS OVERVIEW COMPONENT =====
const StatsOverview = memo(({ totalStats, isLoading, teachers, sortedClasses, onClassesClick, dashboardData, isLoadingCharts, activeRole }) => {
  const [facultyDialogOpen, setFacultyDialogOpen] = useState(false);
  const [activeStudentsDialogOpen, setActiveStudentsDialogOpen] = useState(false);
  const [graduatedStudentsDialogOpen, setGraduatedStudentsDialogOpen] = useState(false);
  const [totalStudentsDialogOpen, setTotalStudentsDialogOpen] = useState(false);
  const [onLeaveDialogOpen, setOnLeaveDialogOpen] = useState(false);
  const [classesDialogOpen, setClassesDialogOpen] = useState(false);

  const sortedTeachersLocal = useMemo(() => {
    return [...(teachers || [])].sort(
      (a, b) => new Date(a.dateOfBirth) - new Date(b.dateOfBirth)
    );
  }, [teachers]);

  if (isLoading) return <StatsOverviewSkeleton />;

  const statCards = [
    {
      title: "Total Faculty",
      value: totalStats.teachersCount,
      icon: UserCheck,
      description: "Active teaching staff",
      onClick: () => setFacultyDialogOpen(true),
      clickLabel: "Click to view faculty profiles →",
    },
    {
      title: "Active Classes",
      value: totalStats.activeClasses,
      icon: BarChart3,
      description: "Ongoing academic classes",
      onClick: () => setClassesDialogOpen(true),
      clickLabel: "Click to view classes →",
    },
    {
      title: "Active Students",
      value: totalStats.activeStudents,
      icon: BookOpen,
      description: "Currently attending classes",
      onClick: () => setActiveStudentsDialogOpen(true),
      clickLabel: "Click to view chart →",
    },
    {
      title: "Graduated Students",
      value: totalStats.graduatedStudents,
      icon: GraduationCap,
      description: "Successfully completed program",
      onClick: () => setGraduatedStudentsDialogOpen(true),
      clickLabel: "Click to view chart →",
    },
    {
      title: "Total Students",
      value: totalStats.studentCount,
      icon: Users,
      description: "All registered students",
      onClick: () => setTotalStudentsDialogOpen(true),
      clickLabel: "Click to view statistics →",
    },
    {
      title: "On Leave",
      value: totalStats.leaveStudents,
      icon: Users,
      description: "Students currently on leave",
      onClick: () => setOnLeaveDialogOpen(true),
      clickLabel: "Click to view students →",
    },
  ];

  const visibleStatCards = activeRole === "Teacher"
    ? statCards.filter((card) => card.title !== "Total Students" && card.title !== "Graduated Students")
    : statCards;

  return (
    <>
      <div className={`grid gap-4 xs:grid-cols-2 ${activeRole === "Teacher" ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {visibleStatCards.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Faculty Profiles Dialog */}
      <Dialog open={facultyDialogOpen} onOpenChange={setFacultyDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5" />
              <span>Faculty Profiles</span>
            </DialogTitle>
            <DialogDescription>
              View active teaching staff profile and information
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-2">
            {sortedTeachersLocal?.map((teacher) => {
              const assignedClass =
                sortedClasses?.find((c) => c.teacherId === teacher._id)?.name ||
                "No Class Assigned";
              return (
                <FacultyProfileCard
                  key={teacher._id}
                  faculty={teacher}
                  assignedClass={assignedClass}
                />
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Students Chart Dialog */}
      <Dialog open={activeStudentsDialogOpen} onOpenChange={setActiveStudentsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <BarChart className="h-5 w-5" />
              <span>Active Students By Batch ({dashboardData?.activeStudents?.length ?? 0})</span>
            </DialogTitle>
            <DialogDescription>
              Distribution of active students across different batches
            </DialogDescription>
          </DialogHeader>
          <BatchChart
            batches={dashboardData?.batches}
            students={dashboardData?.activeStudents}
            isLoading={isLoadingCharts}
          />
        </DialogContent>
      </Dialog>

      {/* Graduated Students Chart Dialog */}
      <Dialog open={graduatedStudentsDialogOpen} onOpenChange={setGraduatedStudentsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <BarChart className="h-5 w-5" />
              <span>Graduated Students By Batch ({dashboardData?.graduatedStudents?.length ?? 0})</span>
            </DialogTitle>
            <DialogDescription>
              Distribution of graduated students across different batches
            </DialogDescription>
          </DialogHeader>
          <BatchChart
            batches={dashboardData?.batches}
            students={dashboardData?.graduatedStudents}
            isLoading={isLoadingCharts}
          />
        </DialogContent>
      </Dialog>

      {/* Total Students Charts Dialog */}
      <Dialog open={totalStudentsDialogOpen} onOpenChange={setTotalStudentsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Total Students ({dashboardData?.students?.length ?? 0})</span>
            </DialogTitle>
            <DialogDescription>
              Student status distribution and breakdown by batch
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Status By Batch</p>
              <StudentStatusByBatchChart
                batches={dashboardData?.batches}
                students={dashboardData?.students}
                isLoading={isLoadingCharts}
              />
            </div>
            <div className="flex justify-start">
              <div className="w-full max-w-md">
                <p className="text-sm font-medium text-muted-foreground mb-2">Status Distribution</p>
                <div className="ml-8">
                  <StudentStatusChart
                    students={dashboardData?.students}
                    isLoading={isLoadingCharts}
                  />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* On Leave Students Dialog */}
      <Dialog open={onLeaveDialogOpen} onOpenChange={setOnLeaveDialogOpen}>
        <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Students On Leave ({dashboardData?.onLeaveStudentsList?.length ?? 0})</span>
            </DialogTitle>
            <DialogDescription>
              Students currently on active leave
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-1">
            {dashboardData?.onLeaveStudentsList?.length > 0 ? (
              dashboardData.onLeaveStudentsList.map((student, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {index + 1}. {student.name} {student.admissionNumber ? `(${student.admissionNumber})` : ""}
                    </span>
                    {student.leaveReason && (
                      <span className="text-xs text-red-600 dark:text-red-400 mt-0.5 font-medium">
                        {student.leaveReason}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded h-fit">{student.className}</span>
                    {student.id && (
                      <span className="text-xs font-mono text-muted-foreground bg-white dark:bg-slate-900 border px-2 py-0.5 rounded shadow-sm h-fit">
                        {student.id}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No students currently on leave</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Classes Dialog */}
      <Dialog open={classesDialogOpen} onOpenChange={setClassesDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>Classes Overview</span>
            </DialogTitle>
            <DialogDescription>
              Detailed information about active classes
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-2">
            {dashboardData.activeClasses.map((classData) => {
              const leaveStudents = dashboardData.leaveRecords?.filter((record) => {
                const student = dashboardData.students.find(
                  (s) => String(s._id) === String(record.studentId?._id || record.studentId)
                );
                if (!student) return false;

                const studentClassId =
                  student.studentSpecificField?.classId?._id ||
                  student.studentSpecificField?.classId ||
                  student.classId?._id ||
                  student.classId;

                return String(studentClassId) === String(classData._id);
              }) || [];

              return (
                <ClassCard
                  key={classData._id}
                  classData={classData}
                  students={dashboardData.students}
                  batches={dashboardData.batches}
                  attendances={dashboardData.attendances}
                  leaveStudents={leaveStudents}
                />
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
});
StatsOverview.displayName = "StatsOverview";

// ===== BATCH CHART COMPONENT =====
const BatchChart = memo(({ batches = [], students = [], isLoading }) => {
  const [barWidth, setBarWidth] = useState(30);

  const handleResize = useCallback(() => {
    const vw = window.innerWidth;
    const calculatedWidth = Math.max(30, Math.floor(vw * 0.05));
    setBarWidth(calculatedWidth);
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  const chartData = useMemo(() => {
    if (!batches?.length || !students?.length) return [];

    return batches
      .map((batch) => ({
        name: batch.name,
        students: students.filter((student) => student.batchId === batch._id)
          .length,
      }))
      .filter((item) => item.students > 0);
  }, [batches, students]);

  if (isLoading) return <ChartSkeleton />;

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center bg-muted/20 rounded-md">
        <p className="text-gray-500">No batch data available</p>
      </div>
    );
  }

  const BAR_GAP = 20;
  const CHART_PADDING = 70;
  const totalWidth = Math.max(
    300,
    (barWidth + BAR_GAP) * chartData.length + CHART_PADDING
  );

  return (
    <div className="h-64 max-w-full overflow-x-auto overflow-y-hidden rounded-md">
      <div style={{ width: `${totalWidth}px`, height: "290px" }}>
        <ResponsiveContainer width="100%" height={290}>
          <RechartsBarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
            barSize={barWidth}
            barGap={0}
            barCategoryGap={BAR_GAP}
          >
            <XAxis
              dataKey="name"
              interval={0}
              angle={-35}
              textAnchor="end"
              height={70}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip
              formatter={(value, name) => [`${value} students`, name]}
              labelFormatter={(label) => `Batch: ${label}`}
            />
            <Legend />
            <Bar
              dataKey="students"
              name="Number of Students"
              fill="#8884d8"
              radius={[4, 4, 0, 0]}
            >
              <LabelList dataKey="students" position="inside" fill="#ffffff" />
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
BatchChart.displayName = "BatchChart";

// ===== STUDENT STATUS CHART COMPONENT =====
const StudentStatusChart = memo(({ students, isLoading }) => {
  const statusData = useMemo(() => {
    if (!students?.length) return [];

    const statusCount = students.reduce((acc, student) => {
      const status = student.status || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(statusCount).map(([name, value]) => ({
      name,
      value,
    }));
  }, [students]);

  if (isLoading) return <ChartSkeleton />;

  if (!statusData.length) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-md">
        <p className="text-muted-foreground">
          No student status data available
        </p>
      </div>
    );
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={statusData}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {statusData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [value, "Students"]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});
StudentStatusChart.displayName = "StudentStatusChart";

import FacultyProfileCard from "./FacultyProfileCard";
import StudentStatusByBatchChart from "./StudentStatusByBatchChart";

// ===== LAZY TIMETABLE COMPONENT =====
const LazyTimeTable = memo(
  ({
    apiKey,
    activeRole,
    timeTable,
    periods,
    attendances,
    classes,
    teachersLeaveRecord,
    useShortName = false,
    hideEmptyClassRows = false,
  }) => (
    <Suspense fallback={<ChartSkeleton height="400px" />}>
      <TimeTableComponent
        apiKey={apiKey}
        hidePrintButton={true}
        role={activeRole}
        timeTable={timeTable}
        periods={periods}
        attendances={attendances}
        classes={classes}
        teachersLeaveRecord={teachersLeaveRecord}
        useShortName={useShortName}
        hideEmptyClassRows={hideEmptyClassRows}
      />
    </Suspense>
  )
);
LazyTimeTable.displayName = "LazyTimeTable";

// ===== MAIN DASHBOARD COMPONENT =====
export default function Dashboard({
  apiKey,
  classes = [],
  batches = [],
  teachers = [],
  timeTable = [],
  periods = [],
  attendances = [],
  leaveRecords = [],
  teachersLeaveRecord = [],
  settings = {},
  activeRole,
}) {
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const router = useRouter();
  const isClient = useIsClient();

  const { useFetchItems: useFetchStudents } = useCrud("users", apiKey);
  const { useFetchItems: useFetchTeachersLeaveRecord } = useCrud("teachers-leave-record", apiKey);
  
  const fetchStudentsQuery = useFetchStudents(
    0,
    0,
    { roles: ["Student"] },
    {
      staleTime: 60000,
      refetchOnWindowFocus: false,
    }
  );
  
  const todaysDate = useMemo(() => new Date().toISOString().split("T")[0], []);
  const teachersLeaveRecordQuery = useFetchTeachersLeaveRecord(0, 0, { date: todaysDate });
  const liveTeachersLeaveRecord = useMemo(() => {
    return teachersLeaveRecordQuery.data?.teachersLeaveRecord || teachersLeaveRecord;
  }, [teachersLeaveRecordQuery.data?.teachersLeaveRecord, teachersLeaveRecord]);

  // Optimized students data using useMemo
  const students = useMemo(() => {
    return fetchStudentsQuery?.data?.users || [];
  }, [fetchStudentsQuery?.data?.users]);

  // Derive loading states
  const isLoadingStudents =
    fetchStudentsQuery.isLoading || fetchStudentsQuery.isFetching;
  const isLoadingStats = isLoadingStudents;
  const isLoadingCharts = isLoadingStudents;

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => sortClasses(a, b));
  }, [classes]);

  // Memoized dashboard data
  const dashboardData = useMemo(() => {
    const activeStudents = students.filter(
      (student) => (student.studentSpecificField?.status || student.status) === "Active"
    );
    const graduatedStudents = students.filter(
      (student) => (student.studentSpecificField?.status || student.status) === "Graduated"
    );
    const activeBatches =
      batches?.filter((batch) => ["Active", "Activated", "Acivated"].includes(batch.status)) || [];
    const activeBatchIds = new Set(activeBatches.map(b => String(b._id)));
    const activeClasses = sortedClasses
      .filter((cls) => {
        const clsBatchId = cls.batchId?._id || cls.batchId;
        const isBatchActive = activeBatchIds.has(String(clsBatchId));
        const isClassActive = cls.status === "Active" || !cls.status;
        return isBatchActive && isClassActive;
      })
      .sort((a, b) =>
        String(a._id || "").localeCompare(String(b._id || ""), undefined, {
          numeric: true,
        })
      );


    return {
      students,
      batches,
      classes: sortedClasses,
      activeClasses,
      teachers,
      activeStudents,
      graduatedStudents,
      attendances,
      leaveRecords,
      totalStats: {
        studentCount:
          fetchStudentsQuery.data?.pagination?.total || students.length,
        teachersCount: teachers.length,
        activeStudents: activeStudents.length,
        graduatedStudents: graduatedStudents.length,
        activeClasses: activeClasses.length,
        leaveStudents: students.filter(student => {
          const studentLeaves = leaveRecords.filter(
            (record) => String(record.studentId?._id || record.studentId) === String(student._id)
          );
          return studentLeaves.some(record => {
            if (record.arrivedDate) return false;
            return !record.arrivedDate;
          });
        }).length,
      },
        onLeaveStudentsList: students
          .filter(student => {
            const studentLeaves = leaveRecords.filter(
              (record) => String(record.studentId?._id || record.studentId) === String(student._id)
            );
            return studentLeaves.some(record => !record.arrivedDate);
          })
          .map(student => {
            const studentLeaves = leaveRecords.filter(
              (record) => String(record.studentId?._id || record.studentId) === String(student._id)
            );
            const activeLeave = studentLeaves.find(record => !record.arrivedDate);
            return {
              id: student._id,
              name: student.studentName || student.name || student.username || "Unknown",
              className: student.className || "N/A",
              admissionNumber: student.studentSpecificField?.admissionNumber || student.admissionNumber || "",
              leaveReason: activeLeave?.reason || activeLeave?.leaveReason || "",
            };
          })
          .sort((a, b) => {
            const idxA = sortedClasses.findIndex(c => c.name === a.className);
            const idxB = sortedClasses.findIndex(c => c.name === b.className);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return (a.className || "").localeCompare(b.className || "");
          }),
    };
  }, [
    students,
    batches,
    sortedClasses,
    teachers,
    attendances,
    leaveRecords,
    fetchStudentsQuery.data,
  ]);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60000);
    return () => clearInterval(interval);
  }, [router]);

  // Error handling
  useEffect(() => {
    if (fetchStudentsQuery.error) {
      console.error("API Error:", fetchStudentsQuery.error);
      setError("An error occurred while fetching data. Please try again.");
    } else {
      setError(null);
    }
  }, [fetchStudentsQuery.error]);

  const currentDate = formatDateForDisplay(new Date());
  const hasClasses = classes.length > 0;

  if (activeRole === "Literary Leader") {
    return (
      <div className="flex flex-col space-y-4">
        <Header
          title="DASHBOARD"
          subTitle={currentDate}
          icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
          className="mb-0 pb-0"
        />
        <LiteraryStudentLookup apiKey={apiKey} />
        <LiterarySummaryCard apiKey={apiKey} />
      </div>
    );
  }
  if (activeRole === "Program Committee" || activeRole === "Program Leader") {
    return (
      <div className="flex flex-col space-y-6">
        <Header
          title="DASHBOARD"
          subTitle={currentDate}
          icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
        />
      </div>
    );
  }

  // Check for Org Admin Committee Poster
  // Check for Org Admin Committee Poster
  if (activeRole === "Org Admin") {
    const committeePosters = settings?.org?.committeePosters || [];
    // Sort by year descending
    const sortedPosters = useMemo(() => {
      return [...committeePosters].sort((a, b) => b.year.toString().localeCompare(a.year.toString()));
    }, [committeePosters]);

    const [posterIndex, setPosterIndex] = useState(0);

    const currentPoster = sortedPosters[posterIndex];

    const handleNext = () => {
      if (posterIndex > 0) {
        setPosterIndex(prev => prev - 1);
      }
    };

    const handlePrev = () => {
      if (posterIndex < sortedPosters.length - 1) {
        setPosterIndex(prev => prev + 1);
      }
    };

    if (currentPoster) {
      return (
        <div className="flex flex-col space-y-4">
          <Header
            title="DASHBOARD"
            subTitle={currentDate}
            icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
          />

          <div className="flex items-center justify-center space-x-4">
            <div className="w-[180px]">
              <Select
                value={posterIndex.toString()}
                onValueChange={(value) => setPosterIndex(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  {sortedPosters.map((poster, index) => (
                    <SelectItem key={poster.year} value={index.toString()}>
                      Year {poster.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="w-full flex items-center justify-center relative rounded-lg overflow-hidden h-[60vh] md:h-[85vh]">
            <div className="relative w-full h-full">
              <Image
                src={currentPoster.poster.url}
                alt={`Committee Poster ${currentPoster.year}`}
                fill
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
          </div>


        </div>
      );
    } else {
      return (
        <div className="flex flex-col space-y-6">
          <Header
            title="DASHBOARD"
            subTitle={currentDate}
            icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
          />
          <div className="flex flex-col h-[calc(100vh-8rem)] items-center justify-center p-4 text-center space-y-4">
            <div className="bg-muted p-6 rounded-full">
              <Calendar className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold">No Committee Poster Found</h2>
            <p className="text-muted-foreground max-w-md">
              Please go to Settings to upload a committee poster for the current
              year. The latest poster will be displayed here.
            </p>
          </div>
        </div>
      );
    }
  }

  const showTimeTable =
    isClient &&
    activeRole &&
    ["Teacher", "College Admin", "Org Admin"].includes(activeRole) &&
    settings?.general?.isWorkingDay;

  const sortedTeachers = useMemo(() => {
    return teachers?.sort(
      (a, b) => new Date(a.dateOfBirth) - new Date(b.dateOfBirth)
    );
  }, [teachers]);

  return (
    <div className="flex flex-col">
      <Header
        title="DASHBOARD"
        subTitle={currentDate}
        icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
      />

      {error && <ErrorAlert message={error} />}

      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >

        <TabsContent value="overview" className="space-y-6">
          {/* TimeTable Section */}
          {showTimeTable && (
            <Card className="border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Today's Schedule</span>
                </CardTitle>
                <CardDescription>
                  View Today's scheduled classes
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <LazyTimeTable
                  apiKey={apiKey}
                  activeRole={activeRole}
                  timeTable={timeTable}
                  periods={periods}
                  attendances={attendances}
                  classes={dashboardData.activeClasses}
                  teachersLeaveRecord={liveTeachersLeaveRecord}
                  useShortName={true}
                  hideEmptyClassRows={false}
                />
              </CardContent>
            </Card>
          )}

          {/* Stats Overview */}
          <StatsOverview
            totalStats={dashboardData.totalStats}
            isLoading={isLoadingStats}
            teachers={teachers}
            sortedClasses={sortedClasses}
            onClassesClick={() => setActiveTab("classes")}
            dashboardData={dashboardData}
            isLoadingCharts={isLoadingCharts}
            activeRole={activeRole}
          />
        </TabsContent>

      </Tabs>
    </div>
  );
}
