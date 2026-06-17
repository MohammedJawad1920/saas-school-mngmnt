import LiteraryAttendanceSheet from "@/components/LiteraryAttendanceSheet";
import { headers } from "next/headers";
import { cookies } from "next/headers";

export default async function LiteraryAttendanceSheetPage() {
    const headersList = headers();
    const apiKey = process.env.API_KEY;

    // Middleware injects "x-user" header as JSON string
    let userId = "";
    try {
        const userHeader = headersList.get("x-user");
        if (userHeader) {
            const user = JSON.parse(userHeader);
            userId = user._id || user.userId;
        }
    } catch (e) {
        console.error("Failed to parse x-user header", e);
    }

    const cookieStore = cookies();
    const userRole = cookieStore.get("active-role")?.value || "Literary Leader";

    return (
        <div className="p-2 md:p-4">
            <div className="mb-2 print:hidden">
                <h1 className="text-2xl font-bold tracking-tight">ATTENDANCE SHEET</h1>
                <p className="text-muted-foreground">View literary attendance history.</p>
            </div>
            <LiteraryAttendanceSheet apiKey={apiKey} userId={userId} userRole={userRole} />
        </div>
    );
}
