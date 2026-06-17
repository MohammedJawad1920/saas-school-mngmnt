import { cookies, headers } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import MarksManager from "@/components/MarksManager";
import { FileSpreadsheet } from "lucide-react";

export default async function MarksPage() {
    const cookieStore = await cookies();
    const activeRole = cookieStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    const allowedRoles = ["College Admin", "Teacher"];
    if (!allowedRoles.includes(activeRole))
        return (
            <ErrorPage
                statusCode={403}
                title="Access Denied"
                description="Only College Admins and Teachers can access Marks."
            />
        );

    return (
        <div className="flex flex-col space-y-2">
            <Header
                title="MARKS MANAGEMENT"
                subTitle="Manage exam marks and results by class"
                icon={<FileSpreadsheet className="h-5 w-5 text-muted-foreground" />}
            />
            <div className="px-4">
                <MarksManager apiKey={apiKey} activeRole={activeRole} />
            </div>
        </div>
    );
}

