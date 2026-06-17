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
  { accessorKey: "programName", header: "Program" },
  { accessorKey: "divisionName", header: "Division" },
  { accessorKey: "teamName", header: "Team" },
  {
    accessorKey: "participantsCount",
    header: "Participants Count",
    type: ["number"],
  },
  {
    accessorKey: "participantNames",
    header: "Participants",
    type: ["array", "vertical"],
  },
  { accessorKey: "status", header: "Status" },
];

const statusMessages = {
  create: "Program registration added successfully!",
  edit: "Program registration updated successfully!",
  delete: "Program registration(s) deleted successfully!",
};

export default async function ProgramRegistrationPage() {
  try {
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const user = parseUser(headerStore);
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    let programs, teams, participants, divisions, settings;

    if (activeRole === "Program Committee") {
      [programs, teams, participants, divisions, settings] = await Promise.all([
        // include divisionId so program select can filter by division
        fetchData(
          "programs",
          "projection=_id,name,maxParticipants,type,divisionId",
          0
        ),
        fetchData("teams", "projection=_id,name", 60),
        // include divisionId for participant option-level filtering
        fetchData("participants", "projection=_id,name,teamId,divisionId", 60),
        fetchData("divisions", "projection=_id,name", 60),
        fetchData("settings", "projection=festival", 60),
      ]);
    } else if (activeRole === "Program Leader") {
      const userTeams = await fetchData(
        "teams",
        `leaderId=${user?.userId}&projection=_id,name`,
        0
      );

      if (!userTeams || userTeams.length === 0) {
        throw new Error("No team found for this program leader");
      }

      const teamIds = userTeams.map((t) => t._id);

      [programs, participants, divisions, settings] = await Promise.all([
        fetchData(
          "programs",
          "projection=_id,name,maxParticipants,type,divisionId",
          60
        ),
        // Only participants from leader's first team
        fetchData(
          "participants",
          `teamId=${teamIds[60]}&projection=_id,name,teamId,divisionId`,
          60
        ),
        fetchData("divisions", "projection=_id,name", 60),
        fetchData("settings", "projection=festival", 60),
      ]);

      teams = userTeams;
    } else {
      throw new Error("Unauthorized access");
    }

    // Forms
    const programCommitteeFormFields = [
      {
        name: "divisionId",
        label: "Division",
        type: "text",
        inputType: "select",
        options: formatOptions(divisions),
        placeholder: "Select division",
      },
      {
        name: "programId",
        label: "Program",
        type: "text",
        inputType: "select",
        options: formatOptions(programs),
        required: true,
        placeholder: "Select program",
        filter: { dependentField: "divisionId" },
        readOnlyOnEdit: true,
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
        name: "participants",
        label: "Participants",
        type: "array",
        inputType: "multiSelect",
        options: formatOptions(participants),
        required: true,
        placeholder: "Select participants",
        validators: {
          minLength: 1,
          minLengthMessage: "At least one participant must be selected",
        },
        filters: [
          { dependentField: "teamId" },
          { dependentField: "divisionId" },
        ],
        helpText: "Select participants",
        showSelectedCount: true,
      },
    ];

    const programLeaderFormFields = [
      {
        name: "divisionId",
        label: "Division",
        type: "text",
        inputType: "select",
        options: formatOptions(divisions),
        placeholder: "Select division",
      },
      {
        name: "programId",
        label: "Program",
        type: "text",
        inputType: "select",
        options: formatOptions(programs),
        required: true,
        placeholder: "Select program",
        filter: { dependentField: "divisionId" },
        readOnlyOnEdit: true,
      },
      {
        name: "participants",
        label: "Participants",
        type: "array",
        inputType: "multiSelect",
        options: formatOptions(participants),
        required: true,
        placeholder: "Select participants",
        validators: {
          minLength: 1,
          minLengthMessage: "At least one participant must be selected",
        },
        showSelectedCount: true,
        filters: [{ dependentField: "divisionId" }],
      },
    ];

    const filterConfig = [
      {
        id: "divisionId",
        label: "Division",
        inputType: "select",
        options: formatOptions(divisions),
      },
      {
        id: "programId",
        label: "Program",
        inputType: "select",
        options: formatOptions(programs),
        filters: [{ dependentField: "divisionId" }],
      },
      {
        id: "teamId",
        label: "Team",
        inputType: "select",
        options: formatOptions(teams),
      },
    ];

    const filteredFilterConfig = filterConfig.filter((filter) => {
      if (activeRole === "Program Committee") {
        return true;
      } else if (activeRole === "Program Leader") {
        // Only show programId and teamId for Program Leader
        return filter.id !== "teamId";
      }
    });

    const formFields =
      activeRole === "Program Committee"
        ? programCommitteeFormFields
        : programLeaderFormFields;

    let apiFilters = {};
    if (activeRole === "Program Leader" && (teams?.length || 0) > 0) {
      apiFilters = {
        teamId: teams[0]._id,
      };
    }

    const deadline = new Date(settings?.festival?.registrationDeadline);

    return (
      <>
        <Header
          title="PROGRAM REGISTRATIONS"
          subTitle={
            activeRole === "Program Committee"
              ? "Manage All Program Registrations"
              : "Manage Your Team's Program Registrations"
          }
          alertTitle={
            activeRole === "Program Leader" && deadline > new Date()
              ? "Registration Deadline:"
              : ""
          }
          alertDescription={
            activeRole === "Program Leader" && deadline > new Date()
              ? `Please register before ${deadline.toLocaleDateString()}.`
              : ""
          }
        />
        <DynamicDataTable
          apiEndpoint="program-registration"
          resource="registrations"
          initialData={[]}
          columnsConfig={columnsConfig}
          formFields={formFields}
          apiKey={apiKey}
          createFormTitle="Register for Program"
          editFormTitle="Update Registration"
          deleteFormTitle="Delete Registration"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filteredFilterConfig}
          limit={20}
          readOnly={
            !(
              activeRole === "Program Committee" ||
              (activeRole === "Program Leader" && deadline > new Date())
            )
          }
          additionalProps={{
            userId: user?.userId,
            activeRole,
            defaultTeamId:
              activeRole === "Program Leader" && teams.length > 0
                ? teams[0]._id
                : null,
          }}
          apiFilters={apiFilters}
          isFestival={true}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading program registration page:", error?.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Access Error"
        description={
          error?.message ||
          "An unexpected error occurred while processing your request."
        }
      />
    );
  }
}

export const revalidate = 60;
