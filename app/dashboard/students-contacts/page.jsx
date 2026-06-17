import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import StudentsContactsTable from "./StudentsContactsTable";
import { fetchData } from "@/lib/utils";

const StudentsContactsPage = async () => {
  try {
    const [classes, batches, students] = await Promise.all([
      fetchData("classes", "projection=_id,name,status,batchId"),
      fetchData("batches", "projection=_id,name,status"),
      fetchData("users", "projection=_id,studentSpecificField.classId,contactNumber,alternativeNumber,studentSpecificField.guardianContactNumber,guardianContactNumber,studentSpecificField.guardianAlternativeNumber,guardianAlternativeNumber&roles=Student&status=Active&limit=5000"),
    ]);

    const activeBatchIds = new Set(
      (batches || [])
        .filter((b) => ["Active", "Activated", "Acivated"].includes(b.status))
        .map((b) => String(b._id))
    );

    const activeClasses = (classes || []).filter((cls) => {
      const clsBatchId = cls.batchId?._id || cls.batchId;
      const isBatchActive = activeBatchIds.has(String(clsBatchId));
      const isClassActive = cls.status === "Active" || !cls.status;
      return isBatchActive && isClassActive;
    }).map((cls) => {
      let contactCount = 0;
      (students || []).forEach(student => {
        // student.classId is mapped as the string/ObjectId from the populated object
        if (String(student.classId) === String(cls._id)) {
            const studentNumber = student.contactNumber ? String(student.contactNumber).replace(/[^\d+]/g, '') : "";
            const altNumber = student.alternativeNumber ? String(student.alternativeNumber).replace(/[^\d+]/g, '') : "";
            
            if (studentNumber && studentNumber !== "-") contactCount++;
            if (altNumber && altNumber !== "-") contactCount++;
            
            const rawGuardianNum = student.studentSpecificField?.guardianContactNumber || student.guardianContactNumber;
            const guardianNumber = rawGuardianNum ? String(rawGuardianNum).replace(/[^\d+]/g, '') : "";
            
            const rawGuardianAltNum = student.studentSpecificField?.guardianAlternativeNumber || student.guardianAlternativeNumber;
            const guardianAltNumber = rawGuardianAltNum ? String(rawGuardianAltNum).replace(/[^\d+]/g, '') : "";
            
            if (guardianNumber && guardianNumber !== "-") contactCount++;
            if (guardianAltNumber && guardianAltNumber !== "-") contactCount++;
        }
      });
      return { ...cls, contactCount };
    });

    return (
      <>
        <Header
          title="STUDENTS CONTACTS"
          subTitle="Browse The List Of Students Contacts By Class"
        />
        <StudentsContactsTable data={activeClasses} apiKey={process.env.API_KEY} />
      </>
    );
  } catch (error) {
    console.error("Error loading students:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default StudentsContactsPage;
export const revalidate = 60;
