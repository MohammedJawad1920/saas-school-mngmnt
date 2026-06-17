// app/dashboard/undeclared-results/page.jsx
import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions } from "@/lib/utils";

const columnsConfig = [
  {
    accessorKey: "serialNo",
    header: "Sl.No",
    type: "serialNo",
    width: 60,
    maxWidth: 60,
    minWidth: 60,
  },
  {
    accessorKey: "programName",
    header: "Program",
  },
  {
    accessorKey: "programType",
    header: "Type",
  },
  {
    accessorKey: "programCategory",
    header: "Category",
  },
  {
    accessorKey: "divisionName",
    header: "Division",
  },
  {
    accessorKey: "teamName",
    header: "Team",
  },
  {
    accessorKey: "evaluatedParticipants",
    header: "Evaluated",
    type: "number",
  },
  {
    accessorKey: "totalParticipants",
    header: "Total",
    type: "number",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
];

export default async function UndeclaredResultsPage() {
  try {
    const apiKey = process.env.APIKEY;

    // Fetch divisions and teams for filter options
    const [divisions, teams] = await Promise.all([
      fetchData("divisions", "projection=id,name", 0),
      fetchData("teams", "projection=id,name", 0),
    ]);

    // Filter configuration
    const filterConfig = [
      {
        id: "divisionName",
        label: "Division",
        inputType: "select",
        options: formatOptions(divisions),
      },
      {
        id: "teamName",
        label: "Team",
        inputType: "select",
        options: formatOptions(teams),
      },
      {
        id: "programType",
        label: "Type",
        inputType: "select",
        options: [
          { value: "Group", label: "Group" },
          { value: "Individual", label: "Individual" },
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

    return (
      <>
        <Header
          title="UNDECLARED RESULTS"
          subTitle="Evaluated programs ready for result declaration"
        />
        <DynamicDataTable
          resource="undeclared-results"
          apiEndpoint="undeclared-results"
          columnsConfig={columnsConfig}
          filterConfig={filterConfig}
          filterTitle="Undeclared Results"
          filterType="api"
          readOnly={true}
          printTitle="Undeclared Results Report"
          apiKey={apiKey}
          limit={50}
          isFestival={true}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading undeclared results:", error.message);
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
