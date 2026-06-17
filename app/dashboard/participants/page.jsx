import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

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
  { accessorKey: "_id", header: "Participant ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "batchName", header: "Batch" },
  {
    accessorKey: "chestNumber",
    header: "Chest Number",
    type: ["number"],
  },
  { accessorKey: "teamName", header: "Team" },
  { accessorKey: "divisionName", header: "Division" },
  {
    accessorKey: "programsCount",
    header: "Programs",
    type: ["number"],
  },
  {
    accessorKey: "stageProgramsCount",
    header: "Stage Programs",
    type: ["number"],
  },
  {
    accessorKey: "offStageProgramsCount",
    header: "Off Stage Programs",
    type: ["number"],
  },
];

const statusMessages = {
  create: "Participant(s) added successfully!",
  edit: "Participant updated successfully!",
  delete: "Participant(s) deleted successfully!",
};

export default async function ParticipantsPage() {
  try {
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const user = parseUser(headerStore);
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    let users, batches, teams, divisions;

    if (activeRole === "Program Committee") {
      [users, batches, teams, divisions] = await Promise.all([
        fetchData(
          "users",
          "projection=_id,name&status=Active&roles=Student",
          0
        ),
        fetchData("batches", "projection=_id,name&status=Active", 0),
        fetchData("teams", "projection=_id,name", 0),
        fetchData("divisions", "projection=_id,name&type=Primary", 0),
      ]);
    } else {
      teams = await fetchData("teams", `leaderId=${user?.userId}`, 0);
      (users = []),
        ([batches, divisions] = await Promise.all([
          fetchData("batches", "projection=_id,name&status=Active", 0),
          fetchData("divisions", "projection=_id,name&type=Primary", 0),
        ]));
    }

    const formFields = [
      {
        name: "batchId",
        label: "Batch",
        type: "text",
        inputType: "select",
        options: formatOptions(batches),
        required: true,
        placeholder: "Select batch",
      },
      {
        name: "participantIds",
        label: "Select Participants",
        type: "array",
        inputType: "multiSelect",
        options: formatOptions(users),
        required: true,
        placeholder: "Select participants",
        validators: {
          minLength: 1,
          minLengthMessage: "At least one participant must be selected",
        },
        helpText: "Participant IDs will be automatically set to match User IDs",
        filter: {
          dependentField: "batchId",
        },
        showSelectedCount: true,
      },
      {
        name: "teamId",
        label: "Team",
        type: "text",
        inputType: "select",
        options: formatOptions(teams),
        required: true,
        placeholder: "Select team",
      },
      {
        name: "divisionId",
        label: "Division",
        type: "text",
        inputType: "select",
        options: formatOptions(divisions),
        required: true,
        placeholder: "Select division",
        helpText:
          "Chest numbers will be auto-assigned based on division range and batch/ID order",
      },
    ];

    // Edit form fields (single participant)
    const editFormFields = [
      {
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "Participant name",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Name must be at least 3 characters long",
        },
        readOnly: true,
      },
      {
        name: "chestNumber",
        label: "Chest Number",
        type: "Number",
        placeholder: "Chest number",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Name must be at least 3 characters long",
        },
      },

      {
        name: "teamId",
        label: "Team",
        type: "text",
        inputType: "select",
        options: formatOptions(teams),
        required: true,
        placeholder: "Select team",
      },
      {
        name: "divisionId",
        label: "Division",
        type: "text",
        inputType: "select",
        options: formatOptions(divisions),
        required: true,
        placeholder: "Select division",
        helpText: "Changing division may reassign chest number",
      },
    ];

    const filterConfig = [
      { id: "name", label: "Name" },
      {
        id: "batchId",
        label: "Batch",
        inputType: "select",
        options: formatOptions(batches),
      },
      {
        id: "teamId",
        label: "Team",
        inputType: "select",
        options: formatOptions(teams),
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
          title="PARTICIPANTS MANAGEMENT"
          subTitle="Organize and Oversee Participants"
        />
        <DynamicDataTable
          resource="participants"
          initialData={[]}
          columnsConfig={filteredColumnsConfig}
          formFields={formFields}
          editFormFields={editFormFields}
          apiKey={apiKey}
          createFormTitle="Add New Participants"
          editFormTitle="Edit Participant"
          deleteFormTitle="Delete Participants"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={1000}
          readOnly={activeRole !== "Program Committee"}
          apiFilters={
            activeRole === "Program Leader"
              ? {
                  teamId: teams[0]?._id || "Unknown",
                }
              : {}
          }
          isFestival={true}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading participants page:", error.message);
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
