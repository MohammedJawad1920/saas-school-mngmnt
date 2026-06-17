import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";
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
  { accessorKey: "_id", header: "Subject ID" },
  { accessorKey: "name", header: "Name" },
];

const formFields = [
  {
    name: "_id",
    label: "Subject ID",
    type: "text",
    placeholder: "Subject ID",
    required: true,
    validators: {
      minLength: 3,
      minLengthMessage: "Subject ID must be at least 3 characters long",
      pattern: "^[A-Z0-9-]+$",
      patternMessage:
        "Subject ID must only contain uppercase letters, numbers, and hyphens (-).",
    },
    hideOnEdit: true,
  },
  {
    name: "name",
    label: "Name",
    type: "text",
    placeholder: "Subject name",
    required: true,
    validators: {
      minLength: 3,
      minLengthMessage: "Name must be at least 3 characters long",
    },
  },
];

const filterConfig = [
  { id: "_id", label: "Subject ID" },
  { id: "name", label: "Name" },
];

const statusMessages = {
  create: "Subject added successfully!",
  edit: "Subject Updated successfully!",
  delete: "Subject deleted successfully!",
};

export default async function BatchesPage() {
  try {
    const apiKey = process.env.API_KEY;

    const subjectsData = await fetchData("subjects", "projection=_id");
    const lastSubjectId = subjectsData?.length > 0 ? subjectsData[subjectsData.length - 1]._id : null;

    const dynamicFormFields = formFields.map((field) => {
      if (field.name === "_id") {
        return {
          ...field,
          placeholder: lastSubjectId ? `Last ID: ${lastSubjectId}` : field.placeholder,
        };
      }
      return field;
    });

    return (
      <>
        <Header
          title="SUBJECTS MANAGEMENT"
          subTitle="Organize and Oversee Batches"
        />
        <DynamicDataTable
          resource="subjects"
          initialData={[]}
          columnsConfig={columnsConfig}
          formFields={dynamicFormFields}
          apiKey={apiKey}
          createFormTitle="Add New Subject"
          editFormTitle="Edit Subject"
          deleteFormTitle="Delete Subject"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={1000}
          enableSearch={true}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading subjects:", error.message);
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
