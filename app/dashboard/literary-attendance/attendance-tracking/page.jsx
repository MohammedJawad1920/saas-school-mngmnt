import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import AdvancedDataTableComponent from "@/components/AdvancedDataTableComponent";
import { fetchData, formatOptions } from "@/lib/utils";
import { trackAllowedDynamicAccess } from "next/dist/server/app-render/dynamic-rendering";

const API_ENDPOINTS = [
  {
    pathname: "classes",
    searchParams: "projection=_id,name",
  },
  {
    pathname: "literary/groups",
    key: "groups",
  },
];

const AttendanceTrackingPage = async () => {
  try {
    const apiKey = process.env.API_KEY;

    const [classes, groups] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(
          endpoint.pathname,
          endpoint.searchParams,
          endpoint.revalidate,
          endpoint.key
        )
      )
    );

    const tabsConfig = [
      {
        label: "GENERAL",
        value: "all",
        resource: "attendanceRecords",
        apiEndpoint: "literary/attendance-records",
        filterTitle: "Literary Attendance - Group",
        printTitle: "Literary Attendance - Group",
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
            header: "Total",
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
          },
          {
            header: "Percentage",
            accessorKey: "percentage",
            type: ["percentage"],
            totalKey: "attendanceRecords",
            filterKey: "present",
            filterValue: true,
          },
        ],
        filterConfig: [
          {
            id: "classId",
            label: "Class",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",

            options: formatOptions(classes),
          },

          {
            id: "date",
            label: "Date Range",
            type: "date",
            inputType: "dateRange",
            nestedArrayField: "attendanceRecords",
            className: "col-span-1 md:col-span-2",
          },
        ],
        readOnly: true,
        filterType: "api",
        apiFilters: {
          category: "ALL",
        },
      },
      {
        label: "GROUP",
        value: "group",
        resource: "attendanceRecords",
        apiEndpoint: "literary/attendance-records",
        filterTitle: "Literary Attendance - Group",
        printTitle: "Literary Attendance - Group",
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
          },
          {
            header: "Percentage",
            accessorKey: "percentage",
            type: ["percentage"],
            totalKey: "attendanceRecords",
            filterKey: "present",
            filterValue: true,
          },
        ],
        filterConfig: [
          {
            id: "groupId",
            label: "Group",
            type: "text",
            inputType: "select",
            nestedArrayField: "attendanceRecords",

            options: formatOptions(groups),
          },
          {
            id: "date",
            label: "Date Range",
            type: "date",
            inputType: "dateRange",
            nestedArrayField: "attendanceRecords",
            className: "col-span-1 md:col-span-2",
          },
        ],
        readOnly: true,
        filterType: "api",
        apiFilters: {
          category: "GROUP",
        },
      },
      {
        label: "HISTORY",
        value: "history",
        resource: "history",
        apiEndpoint: "literary/attendances",
        filterTitle: "Literary Attendance History",
        columnsConfig: [
          {
            header: "Sl.No.",
            accessorKey: "serialNo",
            type: ["serialNo"],
            width: 60,
            maxWidth: 60,
            minWidth: 60,
          },
          { header: "Date", accessorKey: "date", type: ["date", "longDate"] },
          {
            header: "Category",
            accessorKey: "category",
            type: ["mappedValue"],
            valueMap: {
              "ALL": "General",
              "GROUP": "Group"
            }
          },
          {
            header: "Absentees",
            accessorKey: "absentees",
            valueKey: "absentees",
            type: ["length"],
            clickable: true,
          },
        ],
        filterConfig: [
          {
            id: "category",
            label: "Category",
            type: "text",
            inputType: "select",
            options: [
              { label: "General", value: "ALL" },
              { label: "Group", value: "GROUP" },
            ],
          },
          {
            id: "date",
            label: "Date Range",
            type: "date",
            inputType: "dateRange",
            className: "col-span-1 md:col-span-2",
          },
        ],
        readOnly: true,
        filterType: "api",
        apiFilters: {
          trackHistory: true,
          trackAbsentees: true,
          projection: "_id,date,attendanceData,category,classId",
        },
        defaultSorting: [{ id: "date", desc: true }],
      },
    ];

    return (
      <>
        <Header
          title="ATTENDANCE HISTORY"
          subTitle="Track Attendance Records In Real Time"
        />
        <AdvancedDataTableComponent tabsConfig={tabsConfig} apiKey={apiKey} />
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

export const revalidate = 60;
