import { cookies, headers } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import { parseUser, fetchData } from "@/lib/utils";
import StudentIdentityCard from "@/components/StudentIdentityCard";
import { redirect } from "next/navigation";

export const revalidate = 60;

const StudentIdCardPage = async () => {
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const user = parseUser(headerStore);
    const activeRole = cookiesStore.get("active-role")?.value;

    // College Admin should use the full identity cards management page
    if (activeRole === "College Admin") {
        redirect("/dashboard/identity-cards");
    }

    if (activeRole !== "Student") {
        return (
            <ErrorPage
                statusCode={403}
                title="Access Denied"
                description="Only Students can download their personal Identity Cards."
            />
        );
    }

    try {
        const [settings, usersData] = await Promise.all([
            fetchData("settings"),
            fetchData("users", `_id=${user._id}`),
        ]);

        const studentData = usersData?.[0];

        if (!studentData) {
            throw new Error("Student data not found");
        }

        return (
            <StudentIdentityCard
                student={studentData}
                institution={settings.institution}
                idCardBackgroundImageUrl={settings.idCard?.backgroundImage?.url}
            />
        );
    } catch (error) {
        console.error("Error loading student identity card:", error.message);
        return (
            <ErrorPage
                statusCode={500}
                title="Internal Server Error"
                description="An unexpected error occurred while fetching your ID card."
            />
        );
    }
};

export default StudentIdCardPage;
