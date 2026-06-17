import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import LeaveRegister from "@/components/LeaveRegister";
import { fetchData, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

export default async function LeaveRegisterPage() {
  try {
    const apiKey = process.env.API_KEY;
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const user = parseUser(headerStore);
    const activeRole = cookiesStore.get("active-role")?.value;

    return (
      <LeaveRegister
        apiKey={apiKey}
        role={activeRole}
        teacherId={user?.userId}
      />
    );
  } catch (error) {
    console.error("Error loading leave register:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const dynamic = "force-dynamic";
