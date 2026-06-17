import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions } from "@/lib/utils";
import { cookies } from "next/headers";

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
  { accessorKey: "name", header: "Program Name" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "divisionName", header: "Division" },
  {
    accessorKey: "maxParticipants",
    header: "Max Participants",
    type: ["number"],
  },
  { accessorKey: "pointScheme", header: "Point Scheme" },
];

const statusMessages = {
  create: "Program added successfully!",
  edit: "Program updated successfully!",
  delete: "Program(s) deleted successfully!",
};

export default async function ProgramsPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    // Fetch divisions for form options
    const divisions = await fetchData("divisions", "projection=_id,name", 0);

    const formFields = [
      {
        name: "name",
        label: "Program Name",
        type: "text",
        placeholder: "Enter program name",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Program name must be at least 3 characters long",
        },
      },
      {
        name: "type",
        label: "Program Type",
        type: "text",
        inputType: "select",
        options: [
          { value: "Group", label: "Group" },
          { value: "Individual", label: "Individual" },
        ],
        required: true,
        placeholder: "Select program type",
      },
      {
        name: "category",
        label: "Category",
        type: "text",
        inputType: "select",
        options: [
          { value: "Stage", label: "Stage" },
          { value: "Off-Stage", label: "Off-Stage" },
        ],
        required: true,
        placeholder: "Select category",
      },
      {
        name: "divisionId",
        label: "Division",
        type: "text",
        inputType: "select",
        options: formatOptions(divisions),
        required: true,
        placeholder: "Select division",
      },
      {
        name: "maxParticipants",
        label: "Maximum Participants",
        type: "number",
        placeholder: "Enter maximum number of participants",
        required: true,
        validators: {
          min: 1,
          minMessage: "Maximum participants must be at least 1",
        },
      },
      {
        name: "pointScheme",
        label: "Point Scheme",
        type: "text",
        inputType: "select",
        options: [
          { value: "3, 2, 1", label: "3, 2, 1" },
          { value: "5, 3, 1", label: "5, 3, 1" },
          { value: "10, 7, 5", label: "10, 7, 5" },
          { value: "15, 10, 5", label: "15, 10, 5" },
          { value: "20, 15, 10", label: "20, 15, 10" },
        ],
        required: true,
        placeholder: "Select point scheme",
      },
    ];

    const filterConfig = [
      { id: "name", label: "Program Name" },
      {
        id: "type",
        label: "Type",
        inputType: "select",
        options: [
          { value: "Group", label: "Group" },
          { value: "Individual", label: "Individual" },
        ],
      },
      {
        id: "category",
        label: "Category",
        inputType: "select",
        options: [
          { value: "Stage", label: "Stage" },
          { value: "Off-Stage", label: "Off-Stage" },
        ],
      },
      {
        id: "divisionId",
        label: "Division",
        inputType: "select",
        options: formatOptions(divisions),
      },
    ];

    const filteredColumnsConfig = columnsConfig.filter((column) => {
      if (activeRole === "Program Committee") {
        return true;
      } else {
        return column.id !== "select";
      }
    });

    return (
      <>
        <Header
          title="PROGRAMS MANAGEMENT"
          subTitle="Organize and Oversee Programs"
        />
        <DynamicDataTable
          resource="programs"
          initialData={[]}
          columnsConfig={filteredColumnsConfig}
          formFields={formFields}
          apiKey={apiKey}
          createFormTitle="Add New Program"
          editFormTitle="Edit Program"
          deleteFormTitle="Delete Programs"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={1000}
          readOnly={activeRole !== "Program Committee"}
          isFestival={true}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading programs page:", error.message);
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
