import { cookies } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import StudentFamilies from "@/components/StudentFamilies";

export default async function StudentFamiliesPage() {
    const cookieStore = await cookies();
    const activeRole = cookieStore.get("active-role")?.value;

    const allowedRoles = ["College Admin"];
    if (!allowedRoles.includes(activeRole))
        return (
            <ErrorPage
                statusCode={403}
                title="Access Denied"
                description="Only College Admins can access Kinship details."
            />
        );

    const apiKey = process.env.API_KEY;

    return (
        <div className="px-1 md:px-4">
            <StudentFamilies apiKey={apiKey} />
        </div>
    );
}
