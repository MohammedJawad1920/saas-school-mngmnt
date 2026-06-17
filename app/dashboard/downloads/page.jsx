import ErrorPage from "@/components/ErrorPage";
import Downloads from "@/components/Downloads";
import { fetchData } from "@/lib/utils";
import { cookies } from "next/headers";

const DownloadsPage = async () => {
  const apiKey = process.env.API_KEY;
  const cookieStore = await cookies();
  const activeRole = cookieStore.get("active-role")?.value;

  try {
    const downloads = await fetchData("downloads");

    return (
      <Downloads
        initialDownloads={downloads}
        apiKey={apiKey}
        activeRole={activeRole}
      />
    );
  } catch (error) {
    console.error("Error loading downloads:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Something went wrong"
        description="We encountered an unexpected error. Our team has been notified and is working to resolve the issue."
      />
    );
  }
};

export default DownloadsPage;

export const dynamic = "force-dynamic";
