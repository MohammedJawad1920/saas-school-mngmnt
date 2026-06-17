import ErrorPage from "@/components/ErrorPage";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import ClientOnlyAdvancedDataTable from "@/components/ClientOnlyAdvancedDataTable";
import StudentAttendanceLookup from "@/components/StudentAttendanceLookupWrapper";
import { fetchData, formatOptions, OPERATORS } from "@/lib/utils";

const API_ENDPOINTS = [
  {
    pathname: "batches",
    searchParams: "projection=_id,name,endYear",
  },
  {
    pathname: "classes",
    searchParams: "projection=_id,name,batchId,coreSubjects,majorSubjects",
  },
  {
    pathname: "subjects",
    searchParams: "projection=_id,name",
  },
  {
    pathname: "users",
    searchParams: "projection=_id,name,studentSpecificField,profilePic,className&roles=Student",
  },
  {
    pathname: "users",
    searchParams: "projection=_id,name,profilePic&roles=Teacher",
  },
];

const AttendanceTrackingPage = async () => {
  try {
    const cookieStore = await cookies();
    const apiKey = process.env.API_KEY;

    const activeRole = cookieStore.get("active-role")?.value;

    const [batches, classes, subjects, students, teachers] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(endpoint.pathname, endpoint.searchParams)
      )
    );

    const formattedClasses = classes.map((c) => ({
      ...c,
      name: c.batchName ? `${c.name} (${c.batchName})` : c.name,
    }));

    // Map subjects to their classes (both core and major)
    const subjectClassMap = {};
    classes.forEach(cls => {
      const allSubjects = [...(cls.coreSubjects || []), ...(cls.majorSubjects || [])];
      allSubjects.forEach(subjectId => {
        // Handle both object (populated) and string (ID) cases
        const sId = typeof subjectId === 'object' ? subjectId._id : subjectId;
        if (sId) {
          if (!subjectClassMap[sId]) {
            subjectClassMap[sId] = [];
          }
          if (!subjectClassMap[sId].includes(cls._id)) {
            subjectClassMap[sId].push(cls._id);
          }
        }
      });
    });

    const formattedSubjects = formatOptions(subjects).map(subject => ({
      ...subject,
      classId: subjectClassMap[subject.value] || []
    }));

    const formattedStudents = formatOptions(students);
    const formattedTeachers = formatOptions(teachers);

    const tabsConfig = [
      {
        label: "Students",
        value: "student",
        resource: "studentAttendances",
        printTitle: "Students Attendances",
        filterTitle: "Student Attendance",
        columnsConfig: [
          {
            header: "Sl.No.",
            accessorKey: "serialNo",
            type: ["serialNo"],
            width: 60,
            maxWidth: 60,
            minWidth: 60,
          },
          {
            header: "Class",
            accessorKey: "attendanceRecords",
            valueKey: "className",
            type: ["arrayWithValueKey"],
          },
          { header: "Student ID", accessorKey: "_id" },
          { header: "Name", accessorKey: "name" },
          {
            header: "Total Class",
            accessorKey: "totalClass",
            valueKey: "attendanceRecords",
            type: ["length"],
          },
          {
            header: "Present",
            id: "present",
            accessorKey: "present",
            type: ["filteredLength"],
            valueKey: "attendanceRecords",
            filterKey: "present",
            filterValue: true,
            clickable: true,
          },
          {
            header: "Absent",
            id: "absent",
            accessorKey: "present",
            type: ["filteredLength"],
            valueKey: "attendanceRecords",
            filterKey: "present",
            filterValue: false,
            clickable: true,
          },
          {
            header: "Percentage",
            accessorKey: "percentage",
            type: ["percentage"],
            totalKey: "attendanceRecords",
            filterKey: "present",
            filterValue: true,
            clickable: true,
          },
        ],
        filterConfig: [
          {
            id: "date",
            label: "Date Range",
            type: "date",
            inputType: "dateRange",
            nestedArrayField: "attendanceRecords",
            className: "col-span-1 md:col-span-2",
          },
          {
            id: "batchId",
            label: "Batch",
            type: "text",
            inputType: "multiSelect",
            options: formatOptions(batches),
          },
          {
            id: "classId",
            label: "Class",
            type: "text",
            inputType: "multiSelect",
            options: formatOptions(formattedClasses),
          },
          {
            id: "subjectId",
            label: "Subject",
            type: "text",
            inputType: "multiSelect",
            nestedArrayField: "attendanceRecords",

            options: formattedSubjects,
            filter: {
              dependentField: "classId",
            },
          },
        ],
        readOnly: true,
        filterType: "api",
        dateRangeInPopup: true,
        enableMonthYearFilter: true,
        highlightHighest: {
          accessorKey: "percentage",
          type: "percentage",
          totalKey: "attendanceRecords",
          filterKey: "present",
          filterValue: true,
          groupBy: "attendanceRecords.0.className",
          className: "bg-green-100/50"
        },
        trailingToolbar: <StudentAttendanceLookup students={formattedStudents} classes={formatOptions(formattedClasses)} />,
        limit: 1000,
        defaultSorting: [],
      },
      {
        label: "Teachers",
        value: "teacher",
        resource: "teacherAttendances",
        filterTitle: "Teacher Attendance",
        printTitle: "Teachers Attendances",
        columnsConfig: [
          {
            header: "Sl.No.",
            accessorKey: "serialNo",
            type: ["serialNo"],
            width: 60,
            maxWidth: 60,
            minWidth: 60,
          },
          { header: "Teacher ID", accessorKey: "_id" },
          { header: "Name", accessorKey: "name" },
          {
            header: "Total Class",
            accessorKey: "totalClass",
            valueKey: "attendanceRecords",
            type: ["length"],
          },
          {
            header: "Present",
            id: "present",
            accessorKey: "present",
            type: ["filteredLength"],
            valueKey: "attendanceRecords",
            filterKey: "present",
            filterValue: true,
            clickable: true,
          },
          {
            header: "Absent",
            id: "absent",
            accessorKey: "present",
            type: ["filteredLength"],
            valueKey: "attendanceRecords",
            filterKey: "present",
            filterValue: false,
            clickable: true,
          },
          {
            header: "Percentage",
            accessorKey: "percentage",
            type: ["percentage"],
            totalKey: "attendanceRecords",
            filterKey: "present",
            filterValue: true,
            clickable: true,
          },
        ],
        filterConfig: [
          {
            id: "date",
            label: "Date Range",
            type: "date",
            inputType: "dateRange",
            nestedArrayField: "attendanceRecords",
            className: "col-span-1 md:col-span-2",
          },
          {
            id: "batchId",
            label: "Batch",
            type: "text",
            inputType: "multiSelect",
            options: formatOptions(batches),
          },
          {
            id: "classId",
            label: "Class",
            type: "text",
            inputType: "multiSelect",
            options: formatOptions(formattedClasses),
          },
          {
            id: "subjectId",
            label: "Subject",
            type: "text",
            inputType: "multiSelect",
            nestedArrayField: "attendanceRecords",

            options: formattedSubjects,
            filter: {
              dependentField: "classId",
            },
          },
        ],
        readOnly: true,
        filterType: "api",
        dateRangeInPopup: true,
        enableMonthYearFilter: true,
        trailingToolbar: <StudentAttendanceLookup students={formattedTeachers} type="teacher" />,
        limit: 1000,
        defaultSorting: [],
      },
    ];
    const tabsConfig2 = [
      {
        label: "Students",
        value: "student",
        resource: "studentAttendances",
        printTitle: "Students Attendances",
        filterTitle: "Student Attendance",
        columnsConfig: [
          {
            header: "Sl.No.",
            accessorKey: "serialNo",
            type: ["serialNo"],
            width: 60,
            maxWidth: 60,
            minWidth: 60,
          },
          { header: "Student ID", accessorKey: "_id" },
          { header: "Name", accessorKey: "name" },
          {
            header: "Total Class",
            accessorKey: "totalClass",
            valueKey: "attendanceRecords",
            type: ["length"],
          },
          {
            header: "Present",
            accessorKey: "present",
            type: ["filteredLength"],
            valueKey: "attendanceRecords",
            filterKey: "present",
            filterValue: true,
            clickable: true,
          },
          {
            header: "Absent",
            id: "absent",
            accessorKey: "present",
            type: ["filteredLength"],
            valueKey: "attendanceRecords",
            filterKey: "present",
            filterValue: false,
            clickable: true,
          },
          {
            header: "Percentage",
            accessorKey: "percentage",
            type: ["percentage"],
            totalKey: "attendanceRecords",
            filterKey: "present",
            filterValue: true,
            clickable: true,
          },
        ],
        filterConfig: [
          {
            id: "date",
            label: "Date Range",
            type: "date",
            inputType: "dateRange",
            nestedArrayField: "attendanceRecords",
            className: "col-span-1 md:col-span-2",
          },
          {
            id: "batchId",
            label: "Batch",
            type: "text",
            inputType: "select",
            options: formatOptions(batches),
          },
          {
            id: "classId",
            label: "Class",
            type: "text",
            inputType: "select",
            options: formatOptions(formattedClasses),
          },
          {
            id: "subjectId",
            label: "Subject",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",

            options: formattedSubjects,
            filter: {
              dependentField: "classId",
            },
          },
        ],
        readOnly: true,
        filterType: "api",
        dateRangeInPopup: true,
        enableMonthYearFilter: true,
        highlightHighest: {
          accessorKey: "percentage",
          type: "percentage",
          totalKey: "attendanceRecords",
          filterKey: "present",
          filterValue: true,
          groupBy: "attendanceRecords.0.className",
          className: "bg-green-100/50"
        },
        trailingToolbar: <StudentAttendanceLookup students={students} />,
        limit: 1000,
        defaultSorting: [],
      },
    ];

    if (activeRole !== "College Admin") {
      return (
        <>
          <Header
            title="ATTENDANCE HISTORY"
            subTitle="Track Attendance Records In Real Time"
          />
          <ClientOnlyAdvancedDataTable
            tabsConfig={tabsConfig2}
            apiKey={apiKey}
          />
        </>
      );
    }

    return (
      <>
        <Header
          title="ATTENDANCE HISTORY"
          subTitle="Track Attendance Records In Real Time"
        />
        <ClientOnlyAdvancedDataTable tabsConfig={tabsConfig} apiKey={apiKey} />
      </>
    );
  } catch (error) {
    console.error("Error :", error);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default AttendanceTrackingPage;

export const revalidate = 0;
