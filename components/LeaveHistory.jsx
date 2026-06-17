"use client";

import { useMemo } from "react";
import DataTableComponent from "@/components/DataTableComponent";
import Header from "@/components/Header";
import { formatOptions } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function LeaveHistory({ classes, students, apiKey, role, teacherClassId }) {
    const sortedClasses = useMemo(() => {
        const classOrder = [
            "PLUS ONE A",
            "PLUS ONE B",
            "PLUS TWO",
            "DEGREE FIRST YEAR",
            "DEGREE SECOND YEAR",
            "DEGREE THIRD YEAR",
            "PG FIRST YEAR",
            "PG SECOND YEAR",
            "8TH STD",
            "9TH STD",
            "10TH STD",
        ].map((name) => name.replace(/\s/g, ""));

        return [...classes].sort((a, b) => {
            const nameA = a.name.trim().toUpperCase().replace(/\s/g, "");
            const nameB = b.name.trim().toUpperCase().replace(/\s/g, "");
            const indexA = classOrder.indexOf(nameA);
            const indexB = classOrder.indexOf(nameB);

            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            if (indexA !== -1) {
                return -1;
            }
            if (indexB !== -1) {
                return 1;
            }
            return a.name.localeCompare(b.name);
        });
    }, [classes]);

    const formattedStudents = useMemo(() => {
        return students.map(student => ({
            ...student,
            classId: student.studentSpecificField?.classId
        }));
    }, [students]);

    // If this teacher has an assigned class, lock all filters/forms to it
    const isTeacherLocked = Boolean(teacherClassId);
    const lockedClass = isTeacherLocked ? classes.find(c => c._id === teacherClassId) : null;

    // apiFilters: always scope records to teacher's class when locked
    const apiFilters = useMemo(() => {
        if (isTeacherLocked && teacherClassId) {
            return { classId: teacherClassId };
        }
        return {};
    }, [isTeacherLocked, teacherClassId]);

    const columnsConfig = [
        {
            id: "select",
            header: "Select",
            type: ["checkbox"],
            width: 50,
            maxWidth: 50,
            minWidth: 50,
        },
        {
            accessorKey: "serialNo",
            header: "Sl.No",
            type: ["serialNo"],
            width: 60,
            maxWidth: 60,
            minWidth: 60,
        },
        {
            accessorKey: "studentId",
            header: "Student ID",
            width: 100,
            maxWidth: 120,
            minWidth: 80,
        },
        { accessorKey: "studentName", header: "Student Name" },
        { accessorKey: "className", header: "Class" },
        { accessorKey: "dateOfLeave", header: "Date of Leave", type: ["date"] },
        { accessorKey: "leaveReason", header: "Leave Reason" },
        { accessorKey: "dateOfArrival", header: "Exp. Arrival", type: ["date"] },
        { accessorKey: "arrivedDate", header: "Actual Arrival", type: ["date"] },
        { accessorKey: "lateReason", header: "Late Reason" },
        {
            accessorKey: "remark",
            header: "Remark",
            cell: ({ row }) => {
                const remark = row.original.remark;
                if (!remark) return <span className="text-muted-foreground">-</span>;

                const variants = {
                    "Very Good": "default",
                    Good: "default",
                    Acceptable: "secondary",
                    Bad: "destructive",
                    "Very Bad": "destructive",
                };

                return <Badge variant={variants[remark] || "outline"}>{remark}</Badge>;
            }
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const { arrivedDate, dateOfArrival } = row.original;
                if (arrivedDate) {
                    return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Returned</Badge>;
                }
                const isOverdue = new Date() > new Date(dateOfArrival);
                if (isOverdue) {
                    return <Badge variant="destructive">Overdue</Badge>;
                }
                return <Badge variant="secondary">Pending</Badge>;
            }

        }
    ];

    const filterConfig = [
        {
            id: "classId",
            label: "Class",
            inputType: "select",
            options: formatOptions(sortedClasses),
            // For class teachers: don't add defaultValue here (it triggers client-side filter
            // that conflicts with the apiFilters server-side scoping). Just disable the dropdown.
            ...(isTeacherLocked ? { disabled: true } : {}),
        },
        {
            id: "studentId",
            label: "Student Name",
            inputType: "select",
            options: formatOptions(formattedStudents),
            filters: [
                {
                    dependentField: "classId",
                }
            ]
        },
        {
            id: "isArrived",
            label: "Status",
            inputType: "select",
            options: [
                { label: "Pending", value: "false" },
                { label: "Returned", value: "true" },
            ],
        },
    ];

    const formFields = [
        {
            name: "classId",
            label: "Class",
            type: "text",
            inputType: "select",
            options: formatOptions(sortedClasses),
            required: true,
            placeholder: "Select Class",
            // For class teachers, lock the class field to their class
            ...(isTeacherLocked ? { defaultValue: teacherClassId, disabled: true } : {}),
        },
        {
            name: "studentId",
            label: "Student",
            type: "text",
            inputType: "select",
            options: formatOptions(formattedStudents),
            required: true,
            placeholder: "Select Student",
            filters: [
                {
                    dependentField: "classId",
                }
            ]
        },
        {
            name: "dateOfLeave",
            label: "Date of Leave",
            type: "date",
            required: true,
            validators: {
                maxDate: new Date().toISOString().split("T")[0],
                maxDateMessage: "Date cannot be in the future",
            },
        },
        {
            name: "leaveReason",
            label: "Leave Reason",
            type: "text",
            required: true,
            placeholder: "Reason for Leave",
        },
        {
            name: "dateOfArrival",
            label: "Date of Arrival",
            type: "date",
            required: true,
            validators: {
                compareWith: [
                    {
                        field: "dateOfLeave",
                        operator: ">=",
                        message: "Arrival date must be on or after the leave date",
                        errorPath: "dateOfArrival",
                    },
                ],
            },
        },
        {
            name: "arrivedDate",
            label: "Arrived Date",
            type: "date",
            placeholder: "Actual Arrival Date",
        },
        {
            name: "lateReason",
            label: "Late Reason",
            type: "text",
            placeholder: "Reason for being late (optional)",
        },
        {
            name: "remark",
            label: "Remark",
            type: "text",
            inputType: "select",
            options: [
                { value: "Very Good", label: "Very Good" },
                { value: "Good", label: "Good" },
                { value: "Acceptable", label: "Acceptable" },
                { value: "Bad", label: "Bad" },
                { value: "Very Bad", label: "Very Bad" },
            ],
            placeholder: "Select Remark",
            conditionalRender: {
                dependentField: "arrivedDate",
            },
        }
    ];

    return (
        <>
            <Header title="LEAVE HISTORY" subTitle={isTeacherLocked && lockedClass ? `Leave Records — ${lockedClass.name}` : "View and Manage All Leave Records"} />
            <DataTableComponent
                resource="leave-records"
                columnsConfig={columnsConfig}
                formFields={formFields}
                apiKey={apiKey}
                createFormTitle="Add Leave Record"
                editFormTitle="Edit Leave Record"
                deleteFormTitle="Delete Leave Record"
                filterConfig={filterConfig}
                filterTitle="Leave Records"
                printTitle="Leave Records"
                limit={2000}
                enableDefaultSort={false}
                tableHeight="auto"
                createButtonClass="bg-blue-600 text-white hover:bg-blue-700 border-none"
                createButtonText="Add Record"
                enableSearch={true}
                mobileSearchPlaceholder="Search student..."
                desktopSearchPlaceholder="Search student by name or ID..."
                apiFilters={apiFilters}
            />
        </>
    );
}
