import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, formatOptions } from "@/lib/utils";
import { cookies } from "next/headers";
import { act } from "react";

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
  { accessorKey: "_id", header: "Division ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "type", header: "Type" },
  {
    accessorKey: "subDivisionsName",
    header: "Sub Divisions",
    type: ["array"],
  },
  { accessorKey: "stageEvents", header: "Stage Events Count" },
  { accessorKey: "offStageEvents", header: "Off-Stage Events Count" },
  { accessorKey: "chestNumberStartsAt", header: "Chest Number Starts At" },
  {
    accessorKey: "participantsCount",
    header: "Participants",
  },
  {
    accessorKey: "programsCount",
    header: "Programs",
  },
];

const filterConfig = [{ id: "name", label: "Name" }];

const statusMessages = {
  create: "Division added successfully!",
  edit: "Division Updated successfully!",
  delete: "Division deleted successfully!",
};

export default async function DivisionsPage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    const divisions = await fetchData(
      "divisions",
      "projection=_id,name&type=Primary",
      0
    );

    const formFields = [
      {
        name: "_id",
        label: "Division ID",
        type: "text",
        placeholder: "Division ID",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Division ID must be at least 3 characters long",
          pattern: "^[A-Z0-9-]+$",
          patternMessage:
            "Division ID must only contain uppercase letters, numbers, and hyphens (-).",
        },
        hideOnEdit: true,
      },
      {
        name: "name",
        label: "Name",
        type: "text",
        placeholder: "Division name",
        required: true,
        validators: {
          minLength: 3,
          minLengthMessage: "Name must be at least 3 characters long",
        },
      },
      {
        name: "type",
        label: "Type",
        type: "text",
        inputType: "select",
        options: [
          { value: "Primary", label: "Primary" },
          { value: "Secondary", label: "Secondary" },
        ],
        required: true,
      },
      {
        name: "subDivisions",
        label: "Sub Divisions",
        type: "array",
        inputType: "multiSelect",
        options: formatOptions(divisions),
        conditionalRender: {
          dependentField: "type",
          expectedValue: "Secondary",
        },
      },
      {
        name: "stageEvents",
        label: "Stage Events",
        type: "number",
        placeholder: "Number of stage events",
        conditionalRender: {
          dependentField: "type",
          expectedValue: "Primary",
        },
      },
      {
        name: "offStageEvents",
        label: "Off-Stage Events",
        type: "number",
        placeholder: "Number of off-stage events",
        conditionalRender: {
          dependentField: "type",
          expectedValue: "Primary",
        },
      },
      {
        name: "chestNumberRange",
        label: "Chest Number Starts At",
        type: "object",
        inputType: "range",
        placeholder: "Chest number starts at",
        required: true,
        conditionalRender: {
          dependentField: "type",
          expectedValue: "Primary",
        },
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
          title="DIVISIONS MANAGEMENT"
          subTitle="Organize and Oversee Divisions"
        />
        <DynamicDataTable
          resource="divisions"
          initialData={[]}
          columnsConfig={filteredColumnsConfig}
          formFields={formFields}
          apiKey={apiKey}
          createFormTitle="Add New Division"
          editFormTitle="Edit Division"
          deleteFormTitle="Delete Division"
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
    console.error("Error loading divisions page:", error.message);
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
