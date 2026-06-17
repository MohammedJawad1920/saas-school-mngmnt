import AttendanceSheet from "@/components/masjid-attendance/AttendanceSheet";
import { headers } from "next/headers";
import { parseUser } from "@/lib/utils";

const MarkAttendancePage = async ({ searchParams }) => {
    const apiKey = process.env.API_KEY;
    const headerStore = await headers();
    const user = parseUser(headerStore);

    // Await searchParams as it might be a promise in future Next.js versions or depending on usage
    const params = await searchParams;

    const { classId, className, batchId, prayer, date, sessionLabel } = params;

    return (
        <AttendanceSheet
            classId={classId}
            className={className}
            batchId={batchId}
            prayer={prayer}
            date={date}
            apiKey={apiKey}
            user={user}
            sessionLabel={sessionLabel}
        />
    );
};

export default MarkAttendancePage;
