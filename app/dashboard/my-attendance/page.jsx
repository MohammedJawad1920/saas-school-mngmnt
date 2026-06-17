import Header from "@/components/Header";
import ErrorPage from "@/components/ErrorPage";
import { parseUser } from "@/lib/utils";
import { headers } from "next/headers";
import MyAttendanceClient from "./MyAttendanceClient";

const MyAttendancePage = async () => {
  try {
    const headerStore = await headers();
    const user = parseUser(headerStore);

    if (!user) {
      return <ErrorPage statusCode={401} title="Unauthorized" description="Please log in to view your attendance." />;
    }

    const apiKey = process.env.API_KEY;

    return (
      <div className="flex flex-col space-y-2">
        <Header title="MY ATTENDANCE" subTitle="Monthly Attendance Statistics" />
        <MyAttendanceClient user={user} apiKey={apiKey} />
      </div>
    );
  } catch (error) {
    console.error("Error in MyAttendancePage:", error);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while loading your attendance data."
      />
    );
  }
};

export default MyAttendancePage;
