import Header from "@/components/Header";
import UpdatesManagement from "@/components/UpdatesManagement";
import { fetchData } from "@/lib/utils";
import ErrorPage from "@/components/ErrorPage";

export default async function UpdatesPage() {
  try {
    const apiKey = process.env.API_KEY;
    const initialUpdates = await fetchData("updates", "", 0);
    
    const settingsData = await fetchData("settings", "", 0);
    const initialUpdatesLogo = settingsData?.institution?.updatesLogo || null;

    return (
      <>
        <Header title="UPDATES" subTitle="Stay Informed with Latest Updates" />
        <UpdatesManagement 
          apiKey={apiKey} 
          initialUpdates={initialUpdates} 
          initialUpdatesLogo={initialUpdatesLogo}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading updates:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing updates."
      />
    );
  }
}

export const revalidate = 0;

