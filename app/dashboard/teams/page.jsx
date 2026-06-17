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
  { accessorKey: "name", header: "Team Name" },
  { accessorKey: "color", header: "Color", type: ["color"], width: 80 },
  { accessorKey: "leaderName", header: "Team Leader" },
  {
    accessorKey: "membersCount",
    header: "Members Count",
    type: ["number"],
  },
];

const filterConfig = [{ id: "name", label: "Team Name" }];

const statusMessages = {
  create: "Team added successfully!",
  edit: "Team updated successfully!",
  delete: "Team deleted successfully!",
};

export default async function TeamsPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    // Fetch users for team leader selection
    const users = await fetchData(
      "users",
      "projection=_id,name&roles=Student&status=Active",
      0
    );

    const formFields = [
      {
        name: "_id",
        label: "Team ID",
        type: "text",
        placeholder: "Team ID",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Team ID must be at least 3 characters long",
          pattern: "^[A-Z0-9-]+$",
          patternMessage:
            "Team ID must only contain uppercase letters, numbers, and hyphens (-).",
        },
        hideOnEdit: true,
      },
      {
        name: "name",
        label: "Team Name",
        type: "text",
        placeholder: "Enter team name",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Team name must be at least 3 characters long",
        },
      },
      {
        name: "leaderId",
        label: "Team Leader",
        type: "text",
        inputType: "select",
        options: formatOptions(users),
        required: true,
        placeholder: "Select team leader",
      },
      {
        name: "color",
        label: "Team Color",
        inputType: "color",
        required: true,
        defaultValue: "#808080",
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
          title="TEAMS MANAGEMENT"
          subTitle="Organize and Oversee Teams"
        />
        <DynamicDataTable
          resource="teams"
          initialData={[]}
          columnsConfig={filteredColumnsConfig}
          formFields={formFields}
          apiKey={apiKey}
          createFormTitle="Add New Team"
          editFormTitle="Edit Team"
          deleteFormTitle="Delete Team"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={20}
          readOnly={activeRole !== "Program Committee"}
          isFestival={true}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading teams page:", error.message);
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
