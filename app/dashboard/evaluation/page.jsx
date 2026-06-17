import EvaluationComponent from "@/components/EvaluationComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

export default async function EvaluationPage() {
  try {
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const user = parseUser(headerStore);
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    // Check if user has permission to access evaluation
    if (!["Program Committee", "Judge"].includes(activeRole)) {
      throw new Error(
        "Unauthorized access - Only Program Committee and Judges can manage evaluation"
      );
    }

    let programs, divisions, gradeSchemes;

    // Fetch required data
    [programs, divisions, gradeSchemes] = await Promise.all([
      fetchData(
        "programs",
        "projection=_id,name,type,category,divisionId,pointScheme",
        0
      ),
      fetchData("divisions", "projection=_id,name", 0),
      fetchData(
        "grade-scheme",
        "projection=_id,markRange,grade,points",
        0,
        "gradeSchemes"
      ),
    ]);

    // Sort data alphabetically
    const sortedPrograms = programs?.sort((a, b) =>
      a.name?.localeCompare(b.name)
    );

    const sortedGradeSchemes = gradeSchemes?.sort(
      (a, b) => b.points - a.points
    );

    const url = `/api/evaluation`;

    return (
      <>
        <Header
          title="PERFORMANCE EVALUATION"
          subTitle={"Manage and Oversee Participant Evaluations"}
        />
        <div className="p-4">
          <EvaluationComponent
            programs={sortedPrograms}
            divisions={divisions}
            gradeSchemes={sortedGradeSchemes}
            url={url}
            apiKey={apiKey}
            additionalProps={{
              userId: user?.userId,
              activeRole,
              userName: user?.name,
            }}
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

export const dynamic = "force-dynamic";
