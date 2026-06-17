// app/dashboard/pending-codeletters/page.jsx
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
    accessorKey: "maxParticipants",
    header: "Max Participants",
    type: "number",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
];

export default async function PendingCodeLettersPage() {
  try {
    const apiKey = process.env.APIKEY;

    // Fetch divisions for filter options
    const divisions = await fetchData("divisions", "projection=id,name", 0);

    // Filter configuration
    const filterConfig = [
      {
        id: "divisionName",
        label: "Division",
        inputType: "select",
        options: formatOptions(divisions),
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
          title="PENDING CODE LETTERS"
          subTitle="Programs with no team registrations"
        />
        <DynamicDataTable
          resource="pending-codeletters"
          apiEndpoint="pending-codeletters"
          columnsConfig={columnsConfig}
          filterConfig={filterConfig}
          filterTitle="Pending Code Letters"
          filterType="api"
          readOnly={true}
          printTitle="Programs Without Registrations"
          apiKey={apiKey}
          limit={50}
          isFestival={true}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading pending code letters:", error.message);
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
