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
  {
    accessorKey: "profilePic",
    header: "Image",
    type: ["avatar"],
    width: 70,
    maxWidth: 70,
    minWidth: 70,
  },
  { accessorKey: "_id", header: "Teacher ID" },
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  { accessorKey: "contactNumber", header: "Contact Number" },
  { accessorKey: "alternativeNumber", header: "Alternative Number" },
  { accessorKey: "dateOfBirth", header: "Date Of Birth", type: ["date"] },
  { accessorKey: "dateOfJoining", header: "Date Of Joining", type: ["date"] },
  { accessorKey: "roles", header: "Roles", type: ["array"] },
  { accessorKey: "address", header: "Address", type: ["nestedObject"] },
  { accessorKey: "status", header: "Status", type: ["badge"] },
];

const formFields = [
  {
    name: "profilePic",
    label: "Add Profile",
    type: "object",
    inputType: "image",
    placeholder: "Profile Pic",
    defaultValue: {},
    className: "md:col-span-2",
    maxFileSize: 2 * 1024 * 1024, // 2MB in bytes
  },
  {
    name: "_id",
    label: "Teacher ID",
    type: "text",
    placeholder: "Teacher ID",
    required: true,
    validators: {
      minLength: 3,
      minLengthMessage: "Teacher ID must be at least 3 characters long",
      pattern: "^[A-Z0-9-]+$",
      patternMessage:
        "Teacher ID can only contain letters, numbers, and hyphens",
    },
    hideOnEdit: true,
  },
  {
    name: "name",
    label: "Name",
    type: "text",
    placeholder: "Teacher name",
    required: true,
    validators: {
      minLength: 3,
      minLengthMessage: "Name must be at least 3 characters long",
    },
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "abcd@gmaill.com",
    required: true,
  },
  {
    name: "contactNumber",
    label: "Contact Number",
    type: "text",
    placeholder: "Contact Number",
    required: true,
    validators: {
      pattern: "^(\\+?\\d{1,3}[-.\\s]?)?\\d{10}$",
      patternMessage: "Invalid contact number format",
    },
  },
  {
    name: "alternativeNumber",
    label: "Alternative Number",
    type: "text",
    placeholder: "Alternative Number",
    validators: {
      pattern: "^(\\+?\\d{1,3}[-.\\s]?)?\\d{10}$",
      patternMessage: "Invalid contact number format",
    },
  },
  {
    name: "dateOfBirth",
    label: "Date Of Birth",
    type: "date",
    placeholder: "Date Of Birth",
    required: true,
    validators: {
      maxDate: new Date().toISOString().split("T")[0],
      maxDateMessage: "Date of birth cannot be in the future",
    },
  },
  {
    name: "dateOfJoining",
    label: "Date Of Joining",
    type: "date",
    placeholder: "Date Of Joining",
    required: true,
    validators: {
      maxDate: new Date().toISOString().split("T")[0],
      maxDateMessage: "Joining date cannot be in the future",
    },
  },
  {
    name: "roles",
    label: "Roles",
    type: "text",
    inputType: "multiSelect",
    defaultValue: ["Teacher"],
    required: true,
    options: [
      { label: "College Admin", value: "College Admin" },
      { label: "Org Admin", value: "Org Admin" },
      { label: "Teacher", value: "Teacher" },
      { label: "Literary Leader", value: "Literary Leader" },
      { label: "Program Committee", value: "Program Committee" },
      { label: "Program Leader", value: "Program Leader" },
      { label: "Spark Admin", value: "Spark Admin" },
      { label: "Librarian", value: "Librarian" },
    ],
    validators: {
      minLength: 1,
      minLengthMessage: "Please select at least one role",
    },
  },
  {
    name: "houseName",
    label: "House Name",
    type: "text",
    placeholder: "House Name",
  },
  {
    name: "place",
    label: "Place",
    type: "text",
    placeholder: "Place",
    required: true,
  },
  {
    name: "postOffice",
    label: "Post Office",
    type: "text",
    placeholder: "Post Office",
  },
  {
    name: "district",
    label: "District",
    type: "text",
    placeholder: "District",
    required: true,
  },
  {
    name: "state",
    label: "State",
    type: "text",
    placeholder: "State",
    required: true,
  },
  {
    name: "pin",
    label: "Pin Code",
    type: "text",
    placeholder: "Pin Code",
    validators: {
      pattern: "^\\d{6}$",
      patternMessage: "Pin Code must be a 6-digit number",
    },
  },
  {
    name: "status",
    label: "Status",
    type: "text",
    inputType: "select",
    defaultValue: "Active",
    required: true,
    options: [
      { label: "Active", value: "Active" },
      { label: "Retired", value: "Retired" },
    ],
  },
];

const filterConfig = [
  { id: "name", label: "Name" },
  {
    id: "status",
    label: "Status",
    inputType: "select",
    options: [
      { label: "Active", value: "Active" },
      { label: "Retired", value: "Retired" },
    ],
  },
];

const statusMessages = {
  create: "Teacher added successfully!",
  edit: "Teacher Updated successfully!",
  delete: "Teacher deleted successfully!",
};

const apiFilters = {
  roles: ["Teacher"],
};

export default async function BatchesPage() {
  try {
    const apiKey = process.env.API_KEY;

    // Default sorting for users is _id descending, so the first one is the largest _id
    const usersData = await fetchData("users", "roles=Teacher&projection=_id&limit=1");
    const lastTeacherId = usersData?.length > 0 ? usersData[0]._id : null;

    const dynamicFormFields = formFields.map((field) => {
      if (field.name === "_id") {
        return {
          ...field,
          placeholder: lastTeacherId ? `Last ID: ${lastTeacherId}` : field.placeholder,
        };
      }
      return field;
    });

    return (
      <>
        <Header
          title="TEACHERS MANAGEMENT"
          subTitle="Organize and Oversee Teachers"
        />
        <DynamicDataTable
          resource="users"
          initialData={[]}
          columnsConfig={columnsConfig}
          formFields={dynamicFormFields}
          apiKey={apiKey}
          createFormTitle="Add New Teacher"
          editFormTitle="Edit Teacher"
          deleteFormTitle="Delete Teacher"
          createSuccessMessage={statusMessages.create}
          editSuccessMessage={statusMessages.edit}
          deleteSuccessMessage={statusMessages.delete}
          filterConfig={filterConfig}
          limit={50}
          tableHeight="calc(100vh - 250px)"
          apiFilters={apiFilters}
          printTitle={"Teachers"}
          enableSearch={true}
          defaultSorting={[{ id: "_id", desc: false }]}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading teachers:", error.message);
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
