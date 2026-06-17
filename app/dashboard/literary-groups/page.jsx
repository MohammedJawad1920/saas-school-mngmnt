import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions, OPERATORS } from "@/lib/utils";

const API_ENDPOINTS = [
  {
    pathname: "classes",
    searchParams: "projection=_id,name",
  },
  {
    pathname: "users",
    searchParams: "roles=Student&projection=_id,name,classId&status=Active",
  },
  {
    pathname: "literary/groups",
    key: "groups",
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
  { accessorKey: "_id", header: "Group ID", meta: { className: "print:hidden" } },
  { accessorKey: "name", header: "Name" },
  {
    id: "leaders",
    header: "Leader / Assist. Leader",
    type: ["dualField"],
    primaryKey: "leaderName",
    primaryLabel: "Leader",
    secondaryKey: "assistantLeaderName",
    secondaryLabel: "Assist. Leader",
    minWidth: 160,
    meta: { minWidth: "160px" },
  },

  {
    accessorKey: "studentsDetails",
    header: "Students",
    type: ["groupedList"],
  },
];

const statusMessages = {
  create: "Group added successfully!",
  edit: "Group Updated successfully!",
  delete: "Group deleted successfully!",
};

export default async function GroupsPage() {
  try {
    const apiKey = process.env.API_KEY;

    const [classes, students, groups] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(
          endpoint.pathname,
          endpoint.searchParams,
          endpoint.revalidate,
          endpoint.key
        )
      )
    );

    const formFields = [
      {
        name: "_id",
        label: "Group ID",
        type: "text",
        placeholder: "Group ID",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Group ID must be at least 3 characters long",
          pattern: "^[A-Z0-9-]+$",
          patternMessage:
            "Group ID must only contain uppercase letters, numbers, and hyphens (-).",
        },
        hideOnEdit: true,
      },
      {
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "Group name",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Name must be at least 3 characters long",
        },
      },
      {
        name: "classId",
        label: "Select a class",
        type: "text",
        inputType: "select",
        options: formatOptions(classes),
      },
      {
        name: "leaderId",
        label: "Assign leader",
        type: "text",
        inputType: "select",
        options: formatOptions(students),
        filter: {
          dependentField: "classId",
        },
      },
      {
        name: "assistantLeaderId",
        label: "Assign assistant leader",
        type: "text",
        inputType: "select",
        options: formatOptions(students),
        filter: {
          dependentField: "classId",
        },
      },
      {
        name: "studentsId",
        label: "Assign students",
        type: "array",
        inputType: "multiSelect",
        required: true,
        options: formatOptions(students),
        showSelectedCount: true,
        filter: {
          dependentField: "classId",
        },
      },
    ];

    const filterConfig = [
      { id: "name", label: "Group Name" },
      {
        id: "studentsName",
        label: "Student ID/Name",
        operator: OPERATORS.CONTAINS,
      },
    ];
    return (
      <>
        <Header
          title="GROUPS MANAGEMENT"
          subTitle="Organize and Oversee Groups"
        />
        <DynamicDataTable
          resource="groups"
          apiEndpoint="literary/groups"
          initialData={groups}
          columnsConfig={columnsConfig}
          formFields={formFields}
          apiKey={apiKey}
          createFormTitle="Add New Group"
          editFormTitle="Edit Group"
          deleteFormTitle="Delete Group"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={20}
          printTitle="Literary Groups"
          mobileSplitLayout={true}
          mobileSearchPlaceholder="Search by group or student name..."
          createButtonClass="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-95"
          createButtonText="Add Group"
        />
      </>
    );
  } catch (error) {
    console.error("Error loading groups:", error.message);
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
