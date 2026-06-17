import { cookies } from "next/headers";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import AcademicCalendarManager from "@/components/AcademicCalendarManager";
import { CalendarDays } from "lucide-react";

export default async function AcademicCalendarPage() {
    const cookieStore = await cookies();
    const activeRole = cookieStore.get("active-role")?.value;

    if (activeRole !== "College Admin")
        return (
            <ErrorPage
                statusCode={403}
                title="Access Denied"
                description="Only College Admins can manage the Academic Calendar."
            />
        );

    return (
        <div className="flex flex-col space-y-2">
            <Header
                title="ACADEMIC CALENDAR"
                subTitle="Manage special days per academic year"
                icon={<CalendarDays className="h-5 w-5 text-muted-foreground" />}
            />
            <AcademicCalendarManager apiKey={process.env.API_KEY} />
        </div>
    );
}

export const revalidate = 60;
