import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions } from "@/lib/utils";

const columnsConfig = [
  {
    accessorKey: "serialNo",
    header: "Sl.No",
    type: ["serialNo"],
    width: 60,
    maxWidth: 60,
    minWidth: 60,
  },
  {
    accessorKey: "chestNumber",
    header: "Chest Number",
    type: ["number"],
  },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "teamName", header: "Team" },
  { accessorKey: "divisionName", header: "Division" },
];

export default async function NonWinnersPage() {
  try {
    const apiKey = process.env.API_KEY;

    // Fetch related data for form options
    const [batches, teams, divisions] = await Promise.all([
      fetchData("batches", "projection=_id,name&status=Active", 0),
      fetchData("teams", "projection=_id,name", 0),
      fetchData("divisions", "projection=_id,name&type=Primary", 0),
    ]);

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

    return (
      <>
        <Header title="NON-WINNERS" subTitle="View Non-Winning Participants" />
        <DynamicDataTable
          resource="participants"
          initialData={[]}
          columnsConfig={columnsConfig}
          apiKey={apiKey}
          filterConfig={filterConfig}
          limit={20}
          readOnly={true}
          isFestival={true}
          apiFilters={{
            nonWinners: true,
          }}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading non-winners page:", error.message);
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
