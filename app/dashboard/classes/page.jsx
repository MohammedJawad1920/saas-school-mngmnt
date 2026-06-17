import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions } from "@/lib/utils";

const API_ENDPOINTS = [
  {
    pathname: "batches",
    searchParams: "projection=_id,name,students,startYear,endYear",
  },
  {
    pathname: "users",
    searchParams: "roles=Teacher&projection=_id,name",
  },
  {
    pathname: "subjects",
    searchParams: "projection=_id,name",
  },
];

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
  { accessorKey: "_id", header: "Class ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "shortname", header: "Short Name" },
  { accessorKey: "batchName", header: "Batch" },
  { accessorKey: "teacherName", header: "Teacher" },
  { accessorKey: "coreSubjectsName", header: "Core Subjects", type: ["array"] },
  { accessorKey: "majorSubjectsName", header: "Major Subjects", type: ["array"] },
  { accessorKey: "status", header: "Status", type: ["badge"] },
];

const statusMessages = {
  create: "Class added successfully!",
  edit: "Class Updated successfully!",
  delete: "Class deleted successfully!",
};

export default async function ClassesPage() {
  try {
    const apiKey = process.env.API_KEY;

    const [batches, teachers, subjects] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(endpoint.pathname, endpoint.searchParams)
      )
    );

    const sortedBatches = [...(batches || [])].sort((a, b) => {
      const yearA = a.startYear || a.endYear || 0;
      const yearB = b.startYear || b.endYear || 0;
      if (yearA !== yearB) return yearB - yearA;
      return (b.name || "").localeCompare(a.name || "");
    });

    const formFields = [
      {
        name: "_id",
        label: "Class ID",
        type: "text",
        placeholder: "Class ID",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Class ID must be at least 3 characters long",
          pattern: "^[A-Z0-9-]+$",
          patternMessage:
            "Class ID must only contain uppercase letters, numbers, and hyphens (-).",
        },
        hideOnEdit: true,
      },
      {
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "Class name",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Name must be at least 3 characters long",
        },
      },
      {
        name: "shortname",
        label: "Short Name",
        type: "text",
        placeholder: "Short name (e.g., 10-A)",
        required: true,
        validators: {
          minLength: 2,
          minLengthMessage: "Short name must be at least 2 characters long",
        },
      },
      {
        name: "batchId",
        label: "Assign a batch",
        type: "text",
        inputType: "select",
        required: true,
        options: formatOptions(sortedBatches),
      },
      {
        name: "teacherId",
        label: "Assign a teacher",
        type: "text",
        inputType: "select",
        options: formatOptions(teachers),
      },
      {
        name: "coreSubjectIds",
        label: "Assign Core Subjects",
        type: "array",
        inputType: "multiSelect",
        options: formatOptions(subjects),
      },
      {
        name: "majorSubjectIds",
        label: "Assign Major Subjects",
        type: "array",
        inputType: "multiSelect",
        options: formatOptions(subjects),
      },
      {
        name: "status",
        label: "Status",
        type: "text",
        inputType: "select",
        required: true,
        options: [
          { label: "Active", value: "Active" },
          { label: "Closed", value: "Closed" },
        ],
        defaultValue: "Active",
      },
    ];

    const filterConfig = [
      { id: "name", label: "Name" },
      {
        id: "batchId",
        label: "Select a batch",
        inputType: "select",
        options: formatOptions(sortedBatches),
      },
      {
        id: "teacherId",
        label: "Select a teacher",
        inputType: "select",
        options: formatOptions(teachers),
      },
      {
        id: "status",
        label: "Select status",
        inputType: "select",
        options: [
          { label: "Active", value: "Active" },
          { label: "Closed", value: "Closed" },
        ],
      },
    ];

    const classesData = await fetchData("classes", "projection=_id");
    const lastClassId = classesData?.length > 0 ? classesData[classesData.length - 1]._id : null;

    const dynamicFormFields = formFields.map((field) => {
      if (field.name === "_id") {
        return {
          ...field,
          placeholder: lastClassId ? `Last ID: ${lastClassId}` : field.placeholder,
        };
      }
      return field;
    });

    return (
      <>
        <Header
          title="CLASSES MANAGEMENT"
          subTitle="Organize and Oversee Classes"
        />
        <DynamicDataTable
          resource="classes"
          initialData={[]}
          columnsConfig={columnsConfig}
          formFields={dynamicFormFields}
          apiKey={apiKey}
          createFormTitle="Add New Class"
          editFormTitle="Edit Class"
          deleteFormTitle="Delete Class"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={20}
          enableSearch={true}
          defaultSorting={[{ id: "_id", desc: false }]}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading classes:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 0;
export const dynamic = "force-dynamic";
