import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";
import { cookies } from "next/headers";
import StudentsContactsListClient from "@/app/dashboard/students-contacts/[id]/StudentsContactsListClient";

const apiKey = process.env.API_KEY;

const SparkContactsListPage = async ({ params, searchParams }) => {
  try {
    const { id } = await params;
    const searchParamsObj = await searchParams;
    const tab = searchParamsObj?.tab === "alumni" ? "alumni" : "gb";
    const statusFilter = tab === "alumni" ? "Dropped Out" : "Active,Graduated";

    const cookiesStore = await cookies();
    const activeRole = cookiesStore.get("active-role")?.value;
    const isSparkAdmin = activeRole === "Spark Admin";

    // Fetch batch data for title if needed, or get it from the users
    let data = await fetchData(
      "users",
      `projection=_id,name,studentSpecificField.batchId,studentSpecificField.status,profilePic,contactNumber,alternativeNumber,studentSpecificField.guardianName,studentSpecificField.relationship,studentSpecificField.guardianContactNumber,studentSpecificField.guardianAlternativeNumber,admissionNumber,studentSpecificField.admissionNumber&batchId=${id}&roles=Student&status=${statusFilter}`
    );

    if (data && data.length > 0) {
      data = [...data].sort((a, b) => {
        const idA = a.studentSpecificField?.admissionNumber || a.admissionNumber || a._id;
        const idB = b.studentSpecificField?.admissionNumber || b.admissionNumber || b._id;
        return String(idA).localeCompare(String(idB), undefined, { numeric: true });
      });
    }

    let batchDisplayName = "SPARK CONTACTS LIST";
    
    if (data?.length > 0 && data[0].studentSpecificField?.batchId) {
      const batchObj = data[0].studentSpecificField.batchId;
      const academicYear = batchObj.startYear && batchObj.endYear
        ? `${batchObj.startYear}-${(batchObj.endYear % 100).toString().padStart(2, "0")}`
        : "";
      batchDisplayName = academicYear ? `${batchObj.name} (${academicYear})` : batchObj.name;
    }

    const printTitle = `Spark Contacts${batchDisplayName !== "SPARK CONTACTS LIST" ? ` - ${batchDisplayName}` : ""}`;

    return (
      <>
        <Header
          title={batchDisplayName}
          subTitle="View Spark Contact Details"
        />
        <StudentsContactsListClient
          initialData={data}
          apiKey={apiKey}
          printTitle={printTitle}
          isCollegeAdmin={isSparkAdmin}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading spark contacts:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default SparkContactsListPage;
export const revalidate = 60;
