import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
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
    accessorKey: "markRange",
    header: "Mark Range",
    width: 120,
  },
  {
    accessorKey: "grade",
    header: "Grade",
    width: 100,
  },
  {
    accessorKey: "points",
    header: "Points",
    type: ["number"],
    width: 100,
  },
];

const statusMessages = {
  create: "Grade scheme added successfully!",
  edit: "Grade scheme updated successfully!",
  delete: "Grade scheme(s) deleted successfully!",
};

export default async function GradeSchemePage() {
  try {
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    const formFields = [
      {
        name: "markRange",
        label: "Mark Range",
        type: "text",
        placeholder: "e.g., 90-100, 80-89, 70-79",
        required: true,
        validators: {
          pattern: "^\\d+-\\d+$",
          patternMessage:
            "Mark range must be in format 'min-max' (e.g., 90-100)",
        },
        helpText:
          "Enter the mark range in format 'minimum-maximum' (e.g., 90-100)",
      },
      {
        name: "grade",
        label: "Grade",
        type: "text",
        placeholder: "Enter grade (e.g., A+, A, B+, B, C+, C, D, F)",
        required: true,
        validators: {
          minLength: 1,
          maxLength: 5,
          minLengthMessage: "Grade must be at least 1 character long",
          maxLengthMessage: "Grade cannot exceed 5 characters",
        },
      },
      {
        name: "points",
        label: "Points",
        type: "number",
        placeholder: "Enter points (e.g., 4.0, 3.7, 3.3)",
        required: true,
        step: "0.1",
        validators: {
          min: 0,
          minMessage: "Points must be a positive value",
        },
      },
    ];

    const filterConfig = [
      { id: "markRange", label: "Mark Range" },
      { id: "grade", label: "Grade" },
      {
        id: "points",
        label: "Points",
        inputType: "number",
      },
    ];

    // Filter columns based on role
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
          title="GRADE SCHEME MANAGEMENT"
          subTitle="Define and Manage Grading Standards"
        />
        <DynamicDataTable
          resource="gradeSchemes"
          apiEndpoint="grade-scheme"
          initialData={[]}
          columnsConfig={filteredColumnsConfig}
          formFields={formFields}
          apiKey={apiKey}
          createFormTitle="Add New Grade Scheme"
          editFormTitle="Edit Grade Scheme"
          deleteFormTitle="Delete Grade Schemes"
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
    console.error("Error loading grade schemes page:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const dynamic = "force-dynamic";
