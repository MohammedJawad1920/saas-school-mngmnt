import ErrorPage from "@/components/ErrorPage";
import LeaveHistory from "@/components/LeaveHistory";
import connectToDB from "@/lib/db";
import Class from "@/models/Class";
import User from "@/models/User";
import { parseUser, sortClasses } from "@/lib/utils";
import { cookies, headers } from "next/headers";

export default async function LeaveHistoryPage() {
    try {
        const apiKey = process.env.API_KEY;
        const headerStore = await headers();
        const cookiesStore = await cookies();
        const user = parseUser(headerStore);
        const activeRole = cookiesStore.get("active-role")?.value;

        await connectToDB();

        const isTeacher = activeRole === "Teacher";

        // If the active role is Teacher, find only the class they are assigned to.
        // Otherwise, fetch all classes.
        let classesData;
        let teacherClassId = null;

        if (isTeacher && user?._id) {
            const teacherClass = await Class.findOne({ teacherId: user._id }).select("_id name").lean();
            classesData = teacherClass ? [teacherClass] : [];
            teacherClassId = teacherClass?._id || null;
        } else {
            classesData = await Class.find({}).select("_id name").lean();
            classesData.sort((a, b) => sortClasses(a, b));
        }

        // If teacher, only fetch students in their class. Otherwise, fetch all active students.
        const studentQuery = { "studentSpecificField.status": "Active", roles: "Student" };
        if (isTeacher && teacherClassId) {
            studentQuery["studentSpecificField.classId"] = teacherClassId;
        }

        const studentsData = await User.find(studentQuery)
            .select("_id name studentSpecificField.classId")
            .sort({ _id: 1 })
            .lean();

        const classes = JSON.parse(JSON.stringify(classesData));
        const students = JSON.parse(JSON.stringify(studentsData));

        return (
            <LeaveHistory
                apiKey={apiKey}
                role={activeRole}
                classes={classes}
                students={students}
                teacherClassId={teacherClassId}
            />
        );
    } catch (error) {
        console.error("Error loading leave history:", error.message);
        return (
            <ErrorPage
                statusCode={500}
                title="Internal Server Error"
                description="An unexpected error occurred while processing your request."
            />
        );
    }
}

export const revalidate = 0; // Dynamic data
