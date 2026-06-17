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
  {
    accessorKey: "dateFormatted",
    header: "Date",
    width: 120,
    minWidth: 120,
  },
  {
    accessorKey: "timeRange",
    header: "Time",
    width: 140,
    minWidth: 140,
  },
  {
    accessorKey: "programName",
    header: "Program",
    minWidth: 200,
  },
  {
    accessorKey: "programType",
    header: "Type",
    width: 100,
    minWidth: 100,
  },
  {
    accessorKey: "programCategory",
    header: "Category",
    width: 120,
    minWidth: 120,
  },
  {
    accessorKey: "divisionName",
    header: "Division",
    width: 150,
    minWidth: 150,
  },
  {
    accessorKey: "stageNumber",
    header: "Stage",
    type: ["number"],
    width: 80,
    minWidth: 80,
  },
  {
    accessorKey: "status",
    header: "Status",
    type: ["status"],
    width: 100,
    minWidth: 100,
  },
  {
    accessorKey: "isPublished",
    header: "Published",
    type: ["boolean"],
    width: 100,
    minWidth: 100,
  },
];

const statusMessages = {
  create: "Schedule added successfully!",
  edit: "Schedule updated successfully!",
  delete: "Schedule(s) deleted successfully!",
};

// Generate stage options
const generateStageOptions = () => {
  const options = [];
  for (let stage = 1; stage <= 10; stage++) {
    options.push({
      value: stage.toString(),
      label: `Stage ${stage}`,
    });
  }
  return options;
};

export default async function SchedulePage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    // Fetch programs for form options
    const programs = await fetchData(
      "programs",
      "projection=_id,name,type,category"
    );

    const divisions = await fetchData("divisions", "projection=_id,name");

    const stageOptions = generateStageOptions();

    const formFields = [
      {
        name: "divisionId",
        label: "Division",
        type: "text",
        inputType: "select",
        options: formatOptions(divisions),
        placeholder: "Select a division",
      },
      {
        name: "programId",
        label: "Program",
        type: "text",
        inputType: "select",
        options: formatOptions(programs),
        required: true,
        placeholder: "Select a program",
        filter: {
          dependentField: "divisionId",
        },
      },
      {
        name: "date",
        label: "Date",
        type: "date",
        required: true,
        validators: {
          min: new Date().toISOString().split("T")[0],
          minMessage: "Date cannot be in the past",
        },
      },
      {
        name: "startTime",
        label: "Start Time",
        type: "time",
        placeholder: "Select start time",
      },
      {
        name: "endTime",
        label: "End Time",
        type: "time",
        placeholder: "Select end time",
      },
      {
        name: "stageNumber",
        label: "Stage Number",
        type: "number",
        inputType: "select",
        options: stageOptions,
        placeholder: "Select stage",
        validators: {
          min: 1,
          minMessage: "Stage number must be at least 1",
        },
      },

      {
        name: "isPublished",
        label: "Publish Schedule",
        inputType: "select",
        options: [
          { value: "true", label: "Published" },
          { value: "false", label: "Draft" },
        ],
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
        filters: [
          {
            dependentField: "divisionId",
          },
        ],
      },
      {
        id: "date",
        label: "Date",
        inputType: "date",
      },
      {
        id: "stageNumber",
        label: "Stage",
        inputType: "select",
        options: stageOptions,
      },
      {
        id: "isPublished",
        label: "Published Status",
        inputType: "select",
        options: [
          { value: "true", label: "Published" },
          { value: "false", label: "Draft" },
        ],
      },
    ];

    const filteredColumnsConfig = columnsConfig.filter((column) => {
      if (activeRole === "Program Committee" || activeRole === "Admin") {
        return true;
      } else {
        return column.id !== "select";
      }
    });

    const multiEditFormFields = [
      {
        name: "isPublished",
        label: "Publish Schedule",
        inputType: "select",
        options: [
          { value: "true", label: "Published" },
          { value: "false", label: "Draft" },
        ],
      },
    ];

    return (
      <>
        <Header
          title="SCHEDULE MANAGEMENT"
          subTitle="Plan and Organize Program Schedules"
        />
        <DynamicDataTable
          resource="schedules"
          initialData={[]}
          columnsConfig={filteredColumnsConfig}
          formFields={formFields}
          apiKey={apiKey}
          createFormTitle="Add New Schedule"
          editFormTitle="Edit Schedule"
          deleteFormTitle="Delete Schedules"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={50}
          readOnly={activeRole !== "Program Committee"}
          printTitle="Event Schedule"
          tableHeight="calc(100vh - 280px)"
          multiEdit={true}
          multiEditFormFields={multiEditFormFields}
          isFestival={true}
          apiFilters={
            activeRole === "Program Committee"
              ? {}
              : {
                  isPublished: "true",
                }
          }
        />
      </>
    );
  } catch (error) {
    console.error("Error loading schedule page:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 30;
