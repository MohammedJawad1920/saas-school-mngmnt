import { cookies } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import StudentsClient from "@/components/StudentsClient.jsx";
import connectToDB from "@/lib/db";
import Batch from "@/models/Batch.js";
import Class from "@/models/Class.js";
import User from "@/models/User.js";
import { sortClasses } from "@/lib/utils";

export default async function AdmissionRegisterPage() {
    try {
        const cookieStore = await cookies();
        const activeRole = cookieStore.get("active-role")?.value;

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
            <StudentsClient
                batches={batches}
                classes={classes}
                activeRole={activeRole}
                apiKey={process.env.API_KEY}
                isReadOnly={true}
                pageTitle="ADMISSION REGISTER"
                filterTitle="Admission Register"
                lastStudentId={lastStudentId}
                excludedColumns={["email", "batchName", "className", "bloodGroup", "roles", "status", "guardianContactNumber", "guardianAlternativeNumber", "contactNumber", "alternativeNumber", "aadharNo", "profilePic", "admissionClassName", "serialNo", "liabilities", "updatedAt"]}
            />
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
}

export const revalidate = 0;

