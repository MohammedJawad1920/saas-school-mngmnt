import IndividualResultsComponent from "@/components/IndividualResultsComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";

export default async function IndividualResultsPage() {
  try {
    const apiKey = process.env.API_KEY;

    let divisions;

    // Fetch required data
    divisions = await fetchData("divisions", "projection=_id,name,type", 0);

    // Sort divisions alphabetically
    const sortedDivisions = divisions?.sort((a, b) =>
      a.name?.localeCompare(b.name)
    );

    return (
      <>
        <Header
          title="INDIVIDUAL RESULTS"
          subTitle="View Individual Participant Results"
        />
        <div className="p-4">
          <IndividualResultsComponent
            divisions={sortedDivisions}
            apiKey={apiKey}
          />
        </div>
      </>
    );
  } catch (error) {
    console.error("Error loading individual results page:", error?.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Access Error"
        description={
          error?.message ||
          "An unexpected error occurred while processing your request."
        }
      />
    );
  }
}

export const revalidate = 30;
