import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import TimeTablesManagements from "@/components/TimeTablesManagements";
import { fetchData } from "@/lib/utils";

const API_ENDPOINTS = [
  {
    pathname: "periods",
  },
  {
    pathname: "subjects",
  },
  {
    pathname: "users",
    searchParams: "roles=Teacher&projection=_id,name",
  },
  {
    pathname: "classes",
    searchParams: "projection=_id,name,coreSubjects,majorSubjects",
  },
];

const TimeTablePage = async () => {
  try {
    const apiKey = process.env.API_KEY;

    let [periods, subjects, teachers, classes] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(endpoint.pathname, endpoint.searchParams)
      )
    );

    if (teachers && teachers.length > 0) {
      teachers = [...teachers].sort((a, b) => {
        return String(a._id).localeCompare(String(b._id), undefined, { numeric: true });
      });
    }

    return (
      <>
        <Header
          title="TIME TABLES MANAGEMENT"
          subTitle="Organize and Oversee Time Tables"
        />
        <TimeTablesManagements
          periods={periods}
          subjects={subjects}
          teachers={teachers}
          classes={classes}
          apiKey={apiKey}
        />
      </>
    );
  } catch (error) {
    console.error("Error loading classes:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default TimeTablePage;

export const revalidate = 60;
