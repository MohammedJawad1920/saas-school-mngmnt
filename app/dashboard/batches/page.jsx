import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";
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
  { accessorKey: "_id", header: "Batch ID" },
  { accessorKey: "name", header: "Name" },
  {
    accessorKey: "academicYear",
    header: "Academic Year",
    type: ["sortable"],
  },
  { accessorKey: "status", header: "Status", type: ["badge"] },
];

const formFields = [
  {
    name: "_id",
    label: "Batch ID",
    type: "text",
    placeholder: "Batch ID",
    required: true,
    validators: {
      minLength: 3,
      minLengthMessage: "Batch ID must be at least 3 characters long",
      pattern: "^[A-Z0-9-]+$",
      patternMessage:
        "Batch ID must only contain uppercase letters, numbers, and hyphens (-).",
    },
    hideOnEdit: true,
  },
  {
    name: "name",
    label: "Name",
    type: "text",
    placeholder: "Batch name",
    required: true,
    validators: {
      minLength: 3,
      minLengthMessage: "Name must be at least 3 characters long",
    },
  },
  {
    name: "startYear",
    label: "Academic Start Year",
    type: "number",
    placeholder: "2024",
    required: true,
    validators: {
      min: 2000,
      minMessage: "Start year cannot be before 2000",
      max: new Date().getFullYear() + 2,
      maxMessage: "Start year cannot be more than 2 years in future",
      compareWith: [
        {
          field: "endYear",
          operator: "<",
          message: "Start year must be before end year",
          errorPath: "startYear",
        },
      ],
      pattern: "^\\d{4}$",
      patternMessage: "Graduation year must be a 4-digit number",
    },
  },
  {
    name: "endYear",
    label: "Academic End Year",
    type: "number",
    placeholder: "2025",
    required: true,
    validators: {
      compareWith: [
        {
          field: "startYear",
          operator: ">",
          message: "End year must be after start year",
          errorPath: "endYear",
        },
      ],
      pattern: "^\\d{4}$",
      patternMessage: "Graduation year must be a 4-digit number",
    },
  },
  {
    name: "status",
    label: "Status",
    type: "text",
    inputType: "select",
    defaultValue: "Acivated",
    required: true,
    options: [
      { label: "Acivated", value: "Acivated" },
      { label: "Graduated", value: "Graduated" },
      { label: "Accelerated", value: "Accelerated" },
    ],
  },
];

const filterConfig = [
  { id: "name", label: "Name" },
  { id: "academicYear", label: "Academic Year" },
  {
    id: "status",
    label: "Status",
    inputType: "select",
    options: [
      { label: "Acivated", value: "Acivated" },
      { label: "Graduated", value: "Graduated" },
      { label: "Accelerated", value: "Accelerated" },
    ],
  },
];

const statusMessages = {
  create: "Batch added successfully!",
  edit: "Batch Updated successfully!",
  delete: "Batch deleted successfully!",
};

export default async function BatchesPage() {
  try {
    const apiKey = process.env.API_KEY;

    const batchesData = await fetchData("batches", "projection=_id");
    const lastBatchId = batchesData?.length > 0 ? batchesData[batchesData.length - 1]._id : null;

    const dynamicFormFields = formFields.map((field) => {
      if (field.name === "_id") {
        return {
          ...field,
          placeholder: lastBatchId ? `Last ID: ${lastBatchId}` : field.placeholder,
        };
      }
      return field;
    });

    return (
      <>
        <Header
          title="BATCHES MANAGEMENT"
          subTitle="Organize and Oversee Batches"
        />
        <DynamicDataTable
          resource="batches"
          initialData={[]}
          columnsConfig={columnsConfig}
          formFields={dynamicFormFields}
          apiKey={apiKey}
          createFormTitle="Add New Batch"
          editFormTitle="Edit Batch"
          deleteFormTitle="Delete Batch"
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
    console.error("Error loading batches:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 60;
