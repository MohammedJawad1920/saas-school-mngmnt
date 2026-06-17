import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import SparkContactsTable from "./SparkContactsTable";
import { fetchData } from "@/lib/utils";
import connectToDB from "@/lib/db";
import Batch from "@/models/Batch";
import User from "@/models/User";

import Link from "next/link";
import { cn } from "@/lib/utils";

const SparkContactsPage = async ({ searchParams }) => {
  try {
    const searchParamsObj = await searchParams;
    const tab = searchParamsObj?.tab === "alumni" ? "alumni" : "gb";
    const statusFilter = tab === "alumni" ? ["Dropped Out"] : ["Active", "Graduated"];

    await connectToDB();

    // Fetch batches
    const batches = await Batch.find().sort({ startYear: 1 }).lean();

    // Fetch users based on the active tab
    const students = await User.find({
        roles: "Student",
        "studentSpecificField.status": { $in: statusFilter }
    }).select("_id studentSpecificField.batchId contactNumber alternativeNumber studentSpecificField.guardianContactNumber guardianContactNumber studentSpecificField.guardianAlternativeNumber guardianAlternativeNumber").lean();

    const allBatches = batches.map((batch) => {
      let contactCount = 0;
      students.forEach(student => {
        if (String(student.studentSpecificField?.batchId) === String(batch._id)) {
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
      // Convert ObjectId to string to avoid serialization issues
      const academicYear = batch.startYear && batch.endYear 
          ? `${batch.startYear}-${(batch.endYear % 100).toString().padStart(2, "0")}`
          : "";
      const displayName = academicYear ? `${batch.name} (${academicYear})` : batch.name;
      
      return { ...batch, name: displayName, _id: String(batch._id), contactCount };
    });

    return (
      <>
        <Header
          title="SPARK CONTACTS"
          subTitle="Browse The List Of Spark Contacts By Batch"
        />
        
        <div className="flex gap-2 mb-4 bg-muted/50 p-1 rounded-md w-fit border border-border">
          <Link 
            href="?tab=gb" 
            className={cn("px-4 py-2 rounded-sm text-sm font-medium transition-colors", tab === "gb" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50 hover:text-foreground")}
          >
            GB Members
          </Link>
          <Link 
            href="?tab=alumni" 
            className={cn("px-4 py-2 rounded-sm text-sm font-medium transition-colors", tab === "alumni" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/50 hover:text-foreground")}
          >
            Alumni Members
          </Link>
        </div>

        <SparkContactsTable data={allBatches} apiKey={process.env.API_KEY} activeTab={tab} />
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

export default SparkContactsPage;
export const revalidate = 60;
