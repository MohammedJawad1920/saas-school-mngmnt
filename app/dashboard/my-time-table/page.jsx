import ErrorPage from "@/components/ErrorPage";
import Header from "@/components/Header";
import TimeTableComponent from "@/components/TimeTableComponent";
import { fetchData, parseUser } from "@/lib/utils";
import { headers } from "next/headers";

const MyTimeTablePage = async () => {
  try {
    const apiKey = process.env.API_KEY;

    const headerStore = await headers();
    const user = parseUser(headerStore);

    const today = new Date();
    const startDate = new Date(today.getTime() + 5.5 * 60 * 60 * 1000);
    startDate.setDate(startDate.getDate() - 6);
    const endDate = new Date();

    const API_ENDPOINTS = [
      {
        pathname: "periods",
      },
      {
        pathname: "attendances",
        searchParams: `teacherId=${user?._id}&startDate=${startDate.toISOString().split("T")[0]}&endDate=${endDate.toISOString().split("T")[0]}`,
      },
      {
        pathname: "teachers-leave-record",
        searchParams: "isForTimeTable=true",
        key: "teachersLeaveRecord",
      },
    ];

    const [periods, attendances, teachersLeaveRecord] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(
          endpoint.pathname,
          endpoint.searchParams,
          endpoint.revalidateTime,
          endpoint.key
        )
      )
    );

    return (
      <>
        <Header title="MY TIME TABLE" subTitle="View Teaching Schedule" />
        <TimeTableComponent
          apiKey={apiKey}
          teacherId={user?._id}
          periods={periods}
          attendances={attendances}
          teachersLeaveRecord={teachersLeaveRecord}
        />
      </>
    );
  } catch (error) {
    console.error("Error :", error);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default MyTimeTablePage;

export const revalidate = 60;
