import CodeLettersComponent from "@/components/CodeLettersComponent";
import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import { fetchData, parseUser } from "@/lib/utils";
import { cookies, headers } from "next/headers";

export default async function CodeLettersPage() {
  try {
    const headerStore = await headers();
    const cookiesStore = await cookies();
    const user = parseUser(headerStore);
    const activeRole = cookiesStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    let programs, divisions;

    if (activeRole === "Program Committee") {
      [programs, divisions] = await Promise.all([
        fetchData(
          "programs",
          "projection=_id,name,type,category,divisionId",
          0
        ),
        fetchData("divisions", "projection=_id,name", 0),
      ]);
    } else if (activeRole === "Program Leader") {
      const userTeams = await fetchData(
        "teams",
        `leaderId=${user?.userId}&projection=_id,name`,
        0
      );

      if (!userTeams || userTeams.length === 0) {
        throw new Error("No team found for this program leader");
      }

      [programs, divisions] = await Promise.all([
        fetchData(
          "programs",
          "projection=_id,name,type,category,divisionId",
          0
        ),
        fetchData("divisions", "projection=_id,name", 0),
      ]);
    } else {
      throw new Error("Unauthorized access");
    }

    // Sort programs alphabetically
    const sortedPrograms = programs?.sort((a, b) =>
      a.name?.localeCompare(b.name)
    );

    const url = `/api/code-letters`;

    return (
      <>
        <Header
          title="CODE LETTERS"
          subTitle={
            activeRole === "Program Committee"
              ? "Assign Code Letters to Programs"
              : "Assign Code Letters to Your Team's Programs"
          }
        />
        <div className="p-4">
          <CodeLettersComponent
            data={sortedPrograms}
            divisions={divisions}
            url={url}
            apiKey={apiKey}
            additionalProps={{
              userId: user?.userId,
              activeRole,
            }}
          />
        </div>
      </>
    );
  } catch (error) {
    console.error("Error loading code letters page:", error?.message);
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
