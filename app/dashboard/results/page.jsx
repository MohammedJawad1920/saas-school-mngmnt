import ResultComponentWrapper from "@/components/ResultComponentWrapper";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

export default async function ResultPage() {
  try {
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const user = parseUser(headerStore);
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    // Check if user has permission to access results
    if (!["Program Committee", "Judge", "Admin"].includes(activeRole)) {
      throw new Error(
        "Unauthorized access - Only Program Committee, Judges, and Admins can manage results"
      );
    }

    let programs, divisions;

    // Fetch required data
    [programs, divisions] = await Promise.all([
      fetchData(
        "programs",
        "projection=_id,name,type,category,divisionId,pointScheme",
        0
      ),
      fetchData("divisions", "projection=_id,name,type", 0),
    ]);

    // Sort data alphabetically
    const sortedPrograms = programs?.sort((a, b) =>
      a.name?.localeCompare(b.name)
    );

    return (
      <>
        <Header
          title="RESULTS MANAGEMENT"
          subTitle="Manage and Declare Competition Results"
        />
        <div className="p-4">
          <ResultComponentWrapper
            programs={sortedPrograms}
            divisions={divisions}
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
    console.error("Error loading result page:", error?.message);
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
