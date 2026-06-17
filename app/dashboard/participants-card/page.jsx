import ErrorPage from "@/components/ErrorPage";
import ParticipantsCard from "@/components/ParticipantsCard";
import { fetchData } from "@/lib/utils";

export const revalidate = 60;

const participantsCardPage = async () => {
  try {
    const [participants, settings, divisions, teams] = await Promise.all([
      fetchData("participants", "", 0),
      fetchData("settings"),
      fetchData("divisions"),
      fetchData("teams"),
    ]);

    return (
      <ParticipantsCard
        participants={participants}
        festivalSettings={{
          ...settings.festival,
        }}
        divisions={divisions}
        teams={teams}
      />
    );
  } catch (error) {
    console.error("Error loading participants card:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default participantsCardPage;
