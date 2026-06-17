import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";
import { cookies } from "next/headers";
import StudentsContactsListClient from "./StudentsContactsListClient";

const apiKey = process.env.API_KEY;

const StudentsContactsListPage = async ({ params }) => {
  try {
    const { id } = await params;
    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const isCollegeAdmin = activeRole === "College Admin";

    let data = await fetchData(
      "users",
      `projection=_id,name,studentSpecificField.batchId,profilePic,contactNumber,alternativeNumber,studentSpecificField.guardianName,studentSpecificField.relationship,studentSpecificField.guardianContactNumber,studentSpecificField.guardianAlternativeNumber,admissionNumber,studentSpecificField.admissionNumber&classId=${id}&roles=Student&status=Active`
    );

    if (data && data.length > 0) {
      data = [...data].sort((a, b) => {
        const idA = a.studentSpecificField?.admissionNumber || a.admissionNumber || a._id;
        const idB = b.studentSpecificField?.admissionNumber || b.admissionNumber || b._id;
        return String(idA).localeCompare(String(idB), undefined, { numeric: true });
      });
    }

    const printTitle = `Students Contacts${data?.length > 0 ? ` - ${data[0].className}` : ""}`;

    return (
      <>
        <Header
          title={data?.length > 0 ? data[0].className : "STUDENTS CONTACTS LIST"}
          subTitle="View Students Contact Details"
        />
        <StudentsContactsListClient
          initialData={data}
          apiKey={apiKey}
          printTitle={printTitle}
          isCollegeAdmin={isCollegeAdmin}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading students contacts:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default StudentsContactsListPage;
export const revalidate = 60;
