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
    accessorKey: "programName",
    header: "Program",
  },
  {
    accessorKey: "divisionName",
    header: "Division",
  },
];

export default async function DeclaredResultsPage() {
  try {
    const apiKey = process.env.API_KEY;

    const divisions = await fetchData("divisions", "projection=_id,name", 0);

    const filterConfig = [
      {
        id: "divisionId",
        label: "Division",
        inputType: "select",
        options: formatOptions(divisions),
      },
    ];

    return (
      <>
        <Header
          title="DECLARED RESULTS"
          subTitle="View and Manage Declared Results"
        />
        <DynamicDataTable
          resource="results"
          initialData={[]}
          columnsConfig={columnsConfig}
          apiKey={apiKey}
          limit={20}
          readOnly={true}
          apiFilters={{
            isResultDeclared: true,
          }}
          filterConfig={filterConfig}
          isFestival={true}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading declared results page:", error.message);
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
