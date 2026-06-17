import ErrorPage from "@/components/ErrorPage";
import MyPeriods from "@/components/MyPeriods";
import { parseUser } from "@/lib/utils";
import { headers } from "next/headers";

const MyPeriodsPage = async () => {
  try {
    const apiKey = process.env.API_KEY;

    const headerStore = await headers();
    const user = parseUser(headerStore);

    return <MyPeriods apiKey={apiKey} teacherId={user?._id} />;
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

export default MyPeriodsPage;

export const revalidate = 0;
