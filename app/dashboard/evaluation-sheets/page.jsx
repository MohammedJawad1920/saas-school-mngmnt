import EvaluationSheetsComponent from "@/components/EvaluationSheetsComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";

export default async function EvaluationSheetsPage() {
  try {
    const apiKey = process.env.API_KEY;

    // Fetch required data
    const [programs, divisions] = await Promise.all([
      fetchData(
        "programs",
        "projection=_id,name,type,category,divisionId,pointScheme",
        0
      ),
      fetchData("divisions", "projection=_id,name", 0),
    ]);

    const sortedPrograms = programs?.sort((a, b) =>
      a.name?.localeCompare(b.name)
    );

    return (
      <>
        <Header title="EVALUATION SHEETS" subTitle="View Evaluation Sheets" />
        <div className="p-4">
          <EvaluationSheetsComponent
            programs={sortedPrograms}
            divisions={divisions}
            apiKey={apiKey}
          />
        </div>
      </>
    );
  } catch (error) {
    console.error("Error loading evaluation page:", error?.message);
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

export const revalidate = 60;
