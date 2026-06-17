"use client";

import DataTableComponent from "@/components/DataTableComponent";
import Header from "@/components/Header";
import { formatOptions } from "@/lib/utils";
import { useMemo, useState } from "react";
import StudentProfileDialog from "@/components/StudentProfileDialog";
import { getStudentFormFields } from "@/lib/studentFormConfig";
import { Button } from "@/components/ui/button";
import { Loader, RefreshCcw, ClipboardList, Users, GraduationCap, BarChart as BarChartIcon } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import useCrud from "@/hooks/use-crud";
import { useCallback, useEffect } from "react";

import { getStudentColumns } from "@/components/table-configs/studentColumns";
import ProfileComparisonDialog from "./ProfileComparisonDialog";
import PendingRequestsDialog from "@/components/PendingRequestsDialog";

const ChartSkeleton = ({ height = "300px" }) => (
  <div className={`h-[${height}] bg-muted/10 rounded-lg flex items-center justify-center`}>
    <Loader className="h-8 w-8 text-muted-foreground animate-spin" />
  </div>
);

const BatchChart = ({ batches = [], students = [], isLoading }) => {
  const [barWidth, setBarWidth] = useState(30);

  const handleResize = useCallback(() => {
    const vw = window.innerWidth;
    setBarWidth(Math.max(30, Math.floor(vw * 0.05)));
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  const chartData = useMemo(() => {
    if (!batches?.length || !students?.length) return [];
    return batches.map(batch => ({
      name: batch.name,
      students: students.filter(student => {
        const studentBatchId = student.studentSpecificField?.batchId?._id || student.studentSpecificField?.batchId || student.batchId?._id || student.batchId;
        return String(studentBatchId) === String(batch._id);
      }).length,
    })).filter(item => item.students > 0);
  }, [batches, students]);

  if (isLoading) return <ChartSkeleton />;
  if (!chartData.length) return <div className="h-64 flex items-center justify-center bg-muted/20 rounded-md"><p className="text-gray-500">No batch data available</p></div>;

  const BAR_GAP = 20;
  const CHART_PADDING = 70;
  const totalWidth = Math.max(300, (barWidth + BAR_GAP) * chartData.length + CHART_PADDING);

  return (
    <div className="h-64 max-w-full overflow-x-auto overflow-y-hidden rounded-md">
      <div style={{ width: `${totalWidth}px`, height: "290px" }}>
        <ResponsiveContainer width="100%" height={290}>
          <RechartsBarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 60 }} barSize={barWidth} barGap={0} barCategoryGap={BAR_GAP}>
            <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip formatter={(value, name) => [`${value} students`, name]} labelFormatter={(label) => `Batch: ${label}`} />
            <Legend />
            <Bar dataKey="students" name="Number of Students" fill="#8884d8" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="students" position="inside" fill="#ffffff" />
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const StudentDashboardView = ({ apiKey, batches }) => {
  const { useFetchItems } = useCrud("users", apiKey);
  const { data, isLoading } = useFetchItems(0, 0, { roles: ["Student"] }, { staleTime: 60000 });
  const [activeStudentsDialogOpen, setActiveStudentsDialogOpen] = useState(false);
  const [graduatedStudentsDialogOpen, setGraduatedStudentsDialogOpen] = useState(false);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const students = data?.users || [];
  const activeStudents = students.filter(s => (s.studentSpecificField?.status || s.status) === "Active");
  const graduatedStudents = students.filter(s => (s.studentSpecificField?.status || s.status) === "Graduated");

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <Card onClick={() => setActiveStudentsDialogOpen(true)} className="border-l-4 border-l-primary hover:shadow-md transition-all cursor-pointer hover:bg-muted/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/10">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
            <div className="p-3 bg-primary/10 rounded-full">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold tracking-tight">{activeStudents.length}</div>
            <p className="text-xs text-muted-foreground mt-2">Currently enrolled students</p>
            <p className="text-xs text-primary font-medium mt-1">Click to view chart →</p>
          </CardContent>
        </Card>

        <Card onClick={() => setGraduatedStudentsDialogOpen(true)} className="border-l-4 border-l-emerald-500 hover:shadow-md transition-all cursor-pointer hover:bg-muted/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-muted/10">
            <CardTitle className="text-sm font-medium text-muted-foreground">Graduated Students</CardTitle>
            <div className="p-3 bg-emerald-500/10 rounded-full">
              <GraduationCap className="h-6 w-6 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold tracking-tight">{graduatedStudents.length}</div>
            <p className="text-xs text-muted-foreground mt-2">Successfully graduated alumni</p>
            <p className="text-xs text-emerald-500 font-medium mt-1">Click to view chart →</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={activeStudentsDialogOpen} onOpenChange={setActiveStudentsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <BarChartIcon className="h-5 w-5" />
              <span>Active Students By Batch ({activeStudents.length})</span>
            </DialogTitle>
            <DialogDescription>
              Distribution of active students across different batches
            </DialogDescription>
          </DialogHeader>
          <BatchChart
            batches={batches}
            students={activeStudents}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={graduatedStudentsDialogOpen} onOpenChange={setGraduatedStudentsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <BarChartIcon className="h-5 w-5" />
              <span>Graduated Students By Batch ({graduatedStudents.length})</span>
            </DialogTitle>
            <DialogDescription>
              Distribution of graduated students across different batches
            </DialogDescription>
          </DialogHeader>
          <BatchChart
            batches={batches}
            students={graduatedStudents}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function StudentsClient({ batches, classes, activeRole, apiKey, isReadOnly = false, pageTitle, excludedColumns = [], filterTitle, lastStudentId }) {
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [comparisonStudent, setComparisonStudent] = useState(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);

  const { useFetchItems } = useCrud("users", apiKey);
  const { data: pendingRequestsData } = useFetchItems(
    0,
    100,
    {
      roles: "Student",
      profileUpdateStatus: "Pending",
    },
    {
      enabled: activeRole === "College Admin" && !isReadOnly && pageTitle !== "ADMISSION REGISTER",
      refetchInterval: 15000,
    }
  );

  const pendingRequestsCount = pendingRequestsData?.users?.length || 0;

  // Use shared column configuration
  const columnsConfig = getStudentColumns({
    classes,
    pageTitle,
    onNameClick: (student) => {
      setSelectedStudent(student);
      setIsProfileOpen(true);
    },
    onProfileRequestClick: (student) => {
      setComparisonStudent(student);
      setIsComparisonOpen(true);
    },
    excludeColumns: ["remarks"]
  });

  const statusMessages = {
    create: "Student added successfully!",
    edit: "Student Updated successfully!",
    delete: "Student deleted successfully!",
  };

  const apiFilters = useMemo(() => ({
    roles: ["Student"],
    populate: "funds",
  }), []);

  const formFields = useMemo(() => getStudentFormFields(batches, classes, lastStudentId), [batches, classes, lastStudentId]);

  const filterConfig = pageTitle === "ADMISSION REGISTER" ? [
    { id: "_id", label: "ID" },
    { id: "name", label: "Name" },
    {
      id: "batchId",
      label: "Batch",
      inputType: "select",
      options: formatOptions(batches),
    },
    {
      id: "classId",
      label: "Class",
      inputType: "select",
      options: formatOptions(classes),
    },
    {
      id: "status",
      label: "Status",
      inputType: "select",
      options: [
        { label: "Active", value: "Active" },
        { label: "Graduated", value: "Graduated" },
        { label: "Dropped Out", value: "Dropped Out" },
      ],
    },
    {
      id: "profileUpdateStatus",
      label: "Review Status",
      inputType: "select",
      options: [
        { label: "Verified", value: "Verified" },
        { label: "Requested", value: "Pending" },
      ],
    },
  ] : [
    { id: "name", label: "Name" },
    { id: "_id", label: "ID" },
    {
      id: "classId",
      label: "Class",
      inputType: "select",
      options: formatOptions(classes),
    },
    {
      id: "batchId",
      label: "Batch",
      inputType: "select",
      options: formatOptions(batches),
    },
    {
      id: "status",
      label: "Status",
      inputType: "select",
      options: [
        { label: "Active", value: "Active" },
        { label: "Graduated", value: "Graduated" },
        { label: "Dropped Out", value: "Dropped Out" },
      ],
    },
    {
      id: "profileUpdateStatus",
      label: "Review Status",
      inputType: "select",
      options: [
        { label: "Verified", value: "Verified" },
        { label: "Requested", value: "Pending" },
      ],
    },
  ];

  const filteredColumnsConfig = columnsConfig.filter((column) => {
    if (excludedColumns.includes(column.accessorKey) || excludedColumns.includes(column.id)) {
      return false;
    }
    if (activeRole === "Teacher" || isReadOnly) {
      return column.header !== "Select";
    }
    if (activeRole === "Student") {
      return [
        "serialNo",
        "profilePic",
        "_id",
        "name",
        "batchName",
        "className",
        "status",
        "updatedAt",
      ].includes(column.accessorKey);
    }
    return true;
  });

  const defaultSorting = useMemo(() => [{ id: "_id", desc: true }], []);

  return (
    <>
      <Header
        title={
          pageTitle || (activeRole !== "College Admin"
            ? "STUDENTS DETAILS"
            : "STUDENTS MANAGEMENT")
        }
        subTitle="Organize and Oversee Students"
      />
      {activeRole === "Student" ? (
        <StudentDashboardView apiKey={apiKey} batches={batches} />
      ) : (
        <DataTableComponent
          key={refreshKey}
          resource="users"
          initialData={[]}
          columnsConfig={filteredColumnsConfig}
          formFields={formFields}
          refetchInterval={15000}
          apiKey={apiKey}
          createFormTitle="Add New Student"
          editFormTitle="Edit Student"
          deleteFormTitle="Delete Student"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={100000}
          apiFilters={apiFilters}
          filterTitle={filterTitle || "Students"}
          printTitle={pageTitle || "Students"}
          enableSearch={true}
          filterType="api"
          readOnly={activeRole !== "College Admin" || isReadOnly}
          tableHeight="calc(100vh - 200px)"
          enableClickToEdit={true}
          clickToEditExcludeColumns={[
            ...filteredColumnsConfig.map(c => c.accessorKey || c.id).filter(id => id !== "_id"),
            "select", "serialNo", "actions", "updatedAt"
          ]}
          formClassName="sm:max-w-4xl"
          defaultSorting={defaultSorting}
          capitalizeInputs={true}
          customTopRightButtons={
            pageTitle !== "ADMISSION REGISTER" ? (
              <Button 
                variant={pendingRequestsCount > 0 ? "destructive" : "outline"}
                className={`h-9 px-3 shrink-0 print:hidden gap-2 ${pendingRequestsCount > 0 ? "bg-red-500 hover:bg-red-600 text-white" : ""}`} 
                onClick={() => setIsRequestsOpen(true)}
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden md:inline">Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                    {pendingRequestsCount}
                  </span>
                )}
              </Button>
            ) : null
          }
        />
      )}

      <StudentProfileDialog
        student={selectedStudent}
        open={isProfileOpen}
        onClose={setIsProfileOpen}
        classes={classes}
        batches={batches}
        apiKey={apiKey}
      />

      <ProfileComparisonDialog
        student={comparisonStudent}
        open={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        onActionComplete={() => setRefreshKey(prev => prev + 1)}
      />

      <PendingRequestsDialog
        open={isRequestsOpen}
        onClose={() => setIsRequestsOpen(false)}
        apiKey={apiKey}
        onView={(student) => {
          setIsRequestsOpen(false);
          setComparisonStudent(student);
          setIsComparisonOpen(true);
        }}
      />
    </>
  );
}
