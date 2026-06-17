import ErrorPage from "@/components/ErrorPage";
import Attendance from "@/components/Attendance";
import { parseUser } from "@/lib/utils";
import { headers } from "next/headers";

const AttendancePage = async () => {
  try {
    const apiKey = process.env.API_KEY;

    const headerStore = await headers();
    const user = parseUser(headerStore);

    return <Attendance apiKey={apiKey} teacherId={user?._id} />;
  } catch (error) {
    console.error("Error :", error);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default AttendancePage;

export const revalidate = 0;
