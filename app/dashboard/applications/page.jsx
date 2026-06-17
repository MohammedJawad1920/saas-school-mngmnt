import DynamicDataTable from "@/components/DynamicDataTable";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import connectToDB from "@/lib/db";
import Batch from "@/models/Batch";
import Class from "@/models/Class";
import User from "@/models/User";
import ApplicationsClient from "@/components/ApplicationsClient";
import { sortClasses } from "@/lib/utils";

export default async function ApplicationsPage() {
  try {
    const apiKey = process.env.API_KEY;

    try {
      await connectToDB();
    } catch (error) {
      console.error("Error connecting to database:", error.message);
      throw error;
    }

    const batchesData = await Batch.find({}).select("_id name startYear endYear").sort({ startYear: -1, endYear: -1 }).lean();
    const classesData = await Class.find({}).select("_id name status").lean();

    // Fetch the last student ID
    const lastStudent = await User.findOne({ roles: "Student" })
      .select("_id")
      .sort({ createdAt: -1 })
      .lean();
    
    const lastStudentId = lastStudent?._id || "None";
    
    classesData.sort((a, b) => a._id.localeCompare(b._id, undefined, { numeric: true, sensitivity: 'base' }));

    const batches = JSON.parse(JSON.stringify(batchesData));
    const classes = JSON.parse(JSON.stringify(classesData));

    return (
      <>
        <Header
          title="APPLICATIONS MANAGEMENT"
          subTitle="Manage Students Applications"
        />
        <ApplicationsClient 
            batches={batches} 
            classes={classes} 
            apiKey={apiKey} 
            lastStudentId={lastStudentId}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading applications:", error.message);
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
