"use client";

import React, { useState, useEffect } from "react";
import DataTableComponent from "@/components/DataTableComponent";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const columnsConfig = [
    {
        id: "select",
        header: "Select",
        type: ["checkbox"],
        width: 30,
        maxWidth: 30,
        minWidth: 30,
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
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    { accessorKey: "className", header: "Class" },
    {
        accessorKey: "studentName",
        header: "Student",
        cell: ({ row }) => `${row.original.studentId} - ${row.original.studentName}`
    },
    {
        accessorKey: "comments",
        header: "Comment",
        meta: {
            minWidth: "200px",
            maxWidth: "300px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
        }
    },
    { accessorKey: "teacherName", header: "Teacher" },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.original.status;
            let variant = "secondary";
            const style = {};

            switch (status) {
                case "advanced":
                    variant = "success";
                    style.backgroundColor = "#047857"; // emerald-700
                    style.color = "white";
                    break;
                case "very good":
                    variant = "success";
                    style.backgroundColor = "#15803d"; // green-700
                    style.color = "white";
                    break;
                case "good":
                    variant = "success";
                    style.backgroundColor = "#22c55e"; // green-500
                    style.color = "white";
                    break;
                case "acceptable":
                    variant = "warning";
                    style.backgroundColor = "#eab308"; // yellow-500
                    style.color = "white";
                    break;
                case "unsatisfied":
                    variant = "warning";
                    style.backgroundColor = "#f97316"; // orange-500
                    style.color = "white";
                    break;
                case "poor":
                    variant = "destructive";
                    style.backgroundColor = "#ef4444"; // red-500
                    style.color = "white";
                    break;
                case "bad":
                    variant = "destructive";
                    style.backgroundColor = "#b91c1c"; // red-700
                    style.color = "white";
                    break;
                case "pending":
                    variant = "secondary";
                    style.backgroundColor = "#64748b"; // slate-500
                    style.color = "white";
                    break;
                default:
                    variant = "outline";
                    break;
            }

            return (
                <Badge variant={variant} style={style}>
                    {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
                </Badge>
            );
        },
    },
];

const statusMessages = {
    create: "Remark added successfully!",
    edit: "Remark updated successfully!",
    delete: "Remark(s) deleted successfully!",
};

export default function RemarksClient({ apiKey, activeRole, user, classes, teachers }) {
    const isTeacher = activeRole === "Teacher";
    const isAdmin = activeRole === "College Admin";
    const canEdit = isAdmin || isTeacher;
    const [isMyRecordsOpen, setIsMyRecordsOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null;
    }

    const statusOptions = [
        { value: "advanced", label: "Advanced" },
        { value: "very good", label: "Very Good" },
        { value: "good", label: "Good" },
        { value: "acceptable", label: "Acceptable" },
        { value: "unsatisfied", label: "Unsatisfied" },
        { value: "poor", label: "Poor" },
        { value: "bad", label: "Bad" },
    ];

    const formFields = [
        {
            name: "date",
            label: "Date",
            type: "date",
            required: true,
            defaultValue: new Date().toISOString().split('T')[0],
        },
        {
            name: "classId",
            label: "Class",
            type: "text",
            inputType: "select",
            options: classes,
            required: true,
            placeholder: "Select Class",
        },
        {
            name: "studentId",
            label: "Student",
            type: "text",
            inputType: "select",
            resource: "users",
            labelKey: ["_id", "name"],
            required: true,
            placeholder: "Select Student",
            filter: {
                dependentField: "classId",
                key: "classId",
            },
            apiFilters: {
                roles: "Student",
                status: "Active",
            },
            className: "md:col-span-2",
        },
        {
            name: "comments",
            label: "Comment",
            type: "text",
            inputType: "textarea",
            required: true,
            placeholder: "Enter remark comment",
            validators: {
                minLength: 3,
                minLengthMessage: "Comment must be at least 3 characters long"
            },
            className: "md:col-span-2",
        },
        {
            name: "teacherId",
            label: "Teacher",
            type: "text",
            inputType: "select",
            options: teachers,
            required: true,
            placeholder: "Select Teacher",
            readOnly: isTeacher,
            defaultValue: isTeacher ? user?.userId : undefined,
        },
        {
            name: "status",
            label: "Status",
            type: "text",
            inputType: "select",
            freeSolo: true,
            options: statusOptions,
            required: true,
            placeholder: "Select or type status",
            defaultValue: "good",
        },
    ];

    const filterConfig = [
        {
            id: "classId",
            label: "Class",
            inputType: "select",
            options: classes,
        },
        ...(isAdmin ? [{
            id: "teacherId",
            label: "Teacher",
            inputType: "select",
            options: teachers,
        }] : [])
    ];

    return (
        <>
            <Header
                title="REMARKS"
                subTitle="Manage Student Remarks"
            />
            <DataTableComponent
                resource="remarks"
                initialData={[]}
                columnsConfig={columnsConfig}
                formFields={formFields}
                apiKey={apiKey}
                createFormTitle="Add New Remark"
                editFormTitle="Edit Remark"
                deleteFormTitle="Delete Remark"
                createSuccessMessage={statusMessages.create}
                editSuccessMessage={statusMessages.edit}
                deleteSuccessMessage={statusMessages.delete}
                filterConfig={filterConfig}
                limit={20}
                readOnly={!canEdit}
                enableDelete={canEdit}
                formClassName="sm:max-w-2xl lg:max-w-3xl"
                enableSearch={true}
                searchBarClassName="w-[200px] sm:w-[280px] lg:w-[400px] xl:w-[500px]"
                desktopSearchPlaceholder="Search student or number..."
                extraSearchFields={["studentId"]}
                additionalProps={{
                    customActions: isTeacher ? (
                        <Button 
                            variant="outline" 
                            onClick={() => setIsMyRecordsOpen(true)}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white border-0"
                        >
                            MY RECORDS
                        </Button>
                    ) : null
                }}
            />

            <Dialog open={isMyRecordsOpen} onOpenChange={setIsMyRecordsOpen}>
                <DialogContent className="max-w-[90vw] h-[80vh] flex flex-col p-4 sm:p-6 overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>My Remark Records</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden mt-2">
                        <DataTableComponent
                            resource="remarks"
                            apiFilters={{ teacherId: user?.userId, myRecords: "true" }}
                            initialData={[]}
                            columnsConfig={columnsConfig}
                            formFields={formFields}
                            apiKey={apiKey}
                            limit={20}
                            readOnly={false}
                            enableDelete={true}
                            enableCreate={false}
                            editFormTitle="Edit Remark"
                            deleteFormTitle="Delete Remark"
                            editSuccessMessage={statusMessages.edit}
                            deleteSuccessMessage={statusMessages.delete}
                            filterConfig={filterConfig}
                            formClassName="sm:max-w-2xl lg:max-w-3xl"
                            enableSearch={true}
                            searchBarClassName="w-[200px] sm:w-[280px] lg:w-[400px]"
                            desktopSearchPlaceholder="Search student or number..."
                            extraSearchFields={["studentId"]}
                            tableHeight="calc(80vh - 180px)"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
