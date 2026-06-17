
import ErrorPage from "@/components/ErrorPage";
import { cookies } from "next/headers";
import Header from "@/components/Header";
import AdvancedDataTableComponent from "@/components/AdvancedDataTableComponent";
import { fetchData, formatOptions, OPERATORS, formatDateForDisplay } from "@/lib/utils";

const API_ENDPOINTS = [
    {
        pathname: "batches",
        searchParams: "projection=_id,name,endYear",
    },
    {
        pathname: "classes",
        searchParams: "projection=_id,name,batchId",
    },
    {
        pathname: "users",
        searchParams: "projection=_id,name,studentSpecificField&roles=Student",
    },
    {
        pathname: "masjid/attendance",
        searchParams: "distinct=prayer",
        key: "prayer"
    },
];

const MasjidAttendanceHistoryPage = async ({ searchParams }) => {
    try {
        const cookieStore = await cookies();
        const apiKey = process.env.API_KEY;

        const [batches, classes, students, prayers] = await Promise.all(
            API_ENDPOINTS.map((endpoint) =>
                fetchData(endpoint.pathname, endpoint.searchParams, 60, endpoint.key)
            )
        );

        console.log("Data check:", {
            batchesLen: batches?.length,
            classesLen: classes?.length,
            studentsLen: students?.length
        });

        const formattedClasses = (classes || []).map((c) => ({
            ...c,
            name: c.name,
        }));

        const currentFilters = await searchParams; // Next.js 15+ await searchParams
        const dateFilter = currentFilters?.date || "";

        // Format date to human readable format for display
        const displayDate = dateFilter ? formatDateForDisplay(dateFilter) : "";

        const formattedStudents = (students || []).map((s) => ({
            ...s,
            date: displayDate // Inject formatted date for display
        }));

        if (formattedStudents.length > 0) {
            console.log("Sample Formatted Student:", {
                id: formattedStudents[0]._id,
                name: formattedStudents[0].name,
                classId: formattedStudents[0].classId,
                rawClassId: formattedStudents[0].studentSpecificField?.classId
            });
        }

        const tablesConfig = [
            {
                // label: "Student", // No longer needed for single table view
                value: "student",
                resource: "studentMasjidAttendances",
                printTitle: "Student Masjid Attendance",
                filterTitle: "Masjid Attendance",
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
                        header: "Total Prayers",
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
                        id: "batchId",
                        label: "Batch",
                        type: "text",
                        inputType: "select",
                        nestedArrayField: "attendanceRecords",
                        options: formatOptions(batches),
                    },
                    {
                        id: "classId",
                        label: "Class",
                        type: "text",
                        inputType: "select",
                        nestedArrayField: "attendanceRecords",
                        options: formatOptions(formattedClasses),
                    },
                    {
                        id: "studentId",
                        label: "Student",
                        type: "text",
                        inputType: "select",
                        nestedArrayField: "attendanceRecords",
                        options: formatOptions(formattedStudents),
                        filter: {
                            dependentField: "classId",
                        },
                    },
                    {
                        id: "prayer",
                        label: "Prayer Name",
                        type: "text",
                        inputType: "select",
                        nestedArrayField: "attendanceRecords",
                        options: (prayers || []).map((p) => ({ value: p, label: p })),
                    },
                    {
                        id: "date",
                        label: "Date Range",
                        type: "date",
                        inputType: "dateRange",
                        nestedArrayField: "attendanceRecords",
                        className: "col-span-1 md:col-span-2",
                        defaultValue: dateFilter,
                    },
                ],
                readOnly: true,
                filterType: "api",
            },
        ];

        return (
            <>
                <Header
                    title="MASJID ATTENDANCE HISTORY"
                    subTitle="Track Masjid Attendance Records"
                />
                <AdvancedDataTableComponent tablesConfig={tablesConfig} apiKey={apiKey} />
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

export default MasjidAttendanceHistoryPage;

export const revalidate = 0;
