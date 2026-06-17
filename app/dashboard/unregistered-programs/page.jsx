import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import AdvancedDataTableComponent from "@/components/AdvancedDataTableComponent";
import { fetchData, formatOptions, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";
import DynamicDataTable from "@/components/DynamicDataTable";

export default async function RegistrationStatusPage() {
  try {
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const user = parseUser(headerStore);
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    let programs, teams, divisions, participants;

    if (activeRole === "Program Committee") {
      [programs, teams, divisions, participants] = await Promise.all([
        fetchData(
          "programs",
          "projection=_id,name,type,category,maxParticipants,divisionId",
          0
        ),
        fetchData("teams", "projection=_id,name", 0),
        fetchData("divisions", "projection=_id,name", 0),
        fetchData("participants", "projection=_id,name,teamId", 0),
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

      [programs, divisions, participants] = await Promise.all([
        fetchData(
          "programs",
          "projection=_id,name,type,category,maxParticipants,divisionId",
          0
        ),
        fetchData("divisions", "projection=_id,name", 0),
        fetchData(
          "participants",
          `teamId=${teamIds[0]}&projection=_id,name,teamId`,
          0
        ),
      ]);

      teams = userTeams;
    } else {
      throw new Error("Unauthorized access");
    }

    // Unregistered programs columns (no team/participant info)
    const columnsConfig = [
      {
        header: "Sl.No.",
        accessorKey: "serialNo",
        type: ["serialNo"],
        width: 60,
        maxWidth: 60,
        minWidth: 60,
      },
      { header: "Program", accessorKey: "programName" },
      { header: "Division", accessorKey: "divisionName" },
      { header: "Registration Status", accessorKey: "registrationStatus" },
    ];

    // Common filter configuration
    const commonFilterConfig = [
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
        filters: [
          {
            dependentField: "divisionId",
          },
        ],
      },
      {
        id: "programType",
        label: "Type",
        inputType: "select",
        options: [
          { value: "Individual", label: "Individual" },
          { value: "Group", label: "Group" },
        ],
      },
      {
        id: "programCategory",
        label: "Category",
        inputType: "select",
        options: [
          { value: "Stage", label: "Stage" },
          { value: "Off-Stage", label: "Off-Stage" },
        ],
      },
    ];

    // Add team filter only for Program Committee
    const filterConfig =
      activeRole === "Program Committee"
        ? [
            ...commonFilterConfig,
            {
              id: "teamId",
              label: "Team",
              inputType: "select",
              options: formatOptions(teams),
            },
          ]
        : commonFilterConfig;

    let apiFilters = {};
    if (activeRole === "Program Leader" && teams?.length > 0) {
      apiFilters = {
        teamId: teams[0]._id || "Unknown",
      };
    }

    return (
      <>
        <Header
          title="UNREGISTERED PROGRAMS"
          subTitle={
            activeRole === "Program Committee"
              ? "View All Unregistered Programs"
              : "View Your Team's Registration Status"
          }
        />
        <DynamicDataTable
          resource="unregisteredPrograms"
          apiEndpoint="program-registration/unregistered"
          printTitle="Unregistered Programs"
          filterTitle="Unregistered Programs"
          initialData={[]}
          columnsConfig={columnsConfig}
          apiKey={apiKey}
          filterConfig={filterConfig}
          apiFilters={apiFilters}
          limit={20}
          readOnly={true}
          isFestival={true}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading registration status page:", error?.message);
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
