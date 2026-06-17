"use client";
import Header from "./Header";
import DynamicDataTable from "./DynamicDataTable";

const Remarks = ({ apiKey, role }) => {
  const columnsConfig = [
    {
      accessorKey: "studentName",
      header: "Student",
      meta: {
        minWidth: "200px",
      },
    },
    {
      accessorKey: "className",
      header: "Class",
      meta: {
        minWidth: "200px",
      },
    },
    {
      accessorKey: "teacherName",
      header: "Teacher",
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => new Date(row.original.date).toLocaleDateString(),
    },
    {
      accessorKey: "comments",
      header: "Comments",
      meta: {
        minWidth: "300px",
      },
    },
    {
      accessorKey: "status",
      header: "Status",
    },
  ];

  const formFields = [
    {
      name: "classId",
      label: "Class",
      type: "text",
      inputType: "select",
      resource: "classes",
      required: true,
    },
    {
      name: "studentId",
      label: "Student",
      type: "text",
      inputType: "select",
      resource: "users",
      required: true,
      freeSolo: true,
      apiFilters: {
        roles: "Student",
      },
      filter: {
        dependentField: "classId",
        key: "studentSpecificField.classId",
      },
    },
    {
      name: "date",
      label: "Date",
      type: "date",
      required: true,
    },
    {
      name: "comments",
      label: "Comments",
      type: "text",
      inputType: "textarea",
      required: true,
    },
    {
      name: "status",
      label: "Status",
      type: "text",
      inputType: "select",
      options: [
        { value: "good", label: "Good" },
        { value: "bad", label: "Bad" },
        { value: "pending", label: "Pending" },
      ],
      required: true,
    },
  ];

  return (
    <div className="space-y-4">
      <Header title="REMARKS" subTitle="Manage Remarks Of Students" />
      <DynamicDataTable
        apiKey={apiKey}
        resource="remarks"
        columnsConfig={columnsConfig}
        formFields={formFields}
        enableDelete={role === "College Admin"}
      />
    </div>
  );
};

export default Remarks;