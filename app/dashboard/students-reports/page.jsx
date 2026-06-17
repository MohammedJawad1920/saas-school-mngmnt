import { cookies } from "next/headers";
import { fetchData } from "@/lib/utils";
import StudentsReportClient from "./StudentsReportClient";
import ErrorPage from "@/components/ErrorPage";

const API_ENDPOINTS = [
    {
        pathname: "batches",
        searchParams: "projection=_id,name,startYear,endYear",
    },
    {
        pathname: "classes",
        searchParams: "projection=_id,name,batchId,subjects",
    },
    {
        pathname: "updates",
        searchParams: "limit=10",
    },
];

const StudentsReportsPage = async () => {
    try {
        const cookieStore = await cookies();
        const apiKey = process.env.API_KEY;
        const activeRole = cookieStore.get("active-role")?.value;

        if (activeRole !== "College Admin" && activeRole !== "Teacher") {
            return (
                <ErrorPage
                    statusCode={403}
                    title="Access Denied"
                    description="You do not have permission to view this page."
                />
            );
        }

        const [batches, classes, updates] = await Promise.all(
            API_ENDPOINTS.map((endpoint) =>
                fetchData(endpoint.pathname, endpoint.searchParams)
            )
        );

        return (
            <StudentsReportClient
                batches={batches}
                classes={classes}
                apiKey={apiKey}
                updates={updates}
            />
        );
    } catch (error) {
        console.error("Error in StudentsReportsPage:", error);
        return (
            <ErrorPage
                statusCode={500}
                title="Internal Server Error"
                description="An unexpected error occurred while loading the reports page."
            />
        );
    }
};

export default StudentsReportsPage;
export const revalidate = 0;
