import SparkDashboardClient from "./SparkDashboardClient";
import { getSparkStats } from "@/libservices/spark-services";
import ErrorPage from "@/components/ErrorPage";

export const dynamic = "force-dynamic";

export default async function SparkPage() {
    try {
        const stats = await getSparkStats();
        return <SparkDashboardClient {...stats} />;
    } catch (error) {
        console.error("Error loading spark stats:", error);
        return (
            <ErrorPage
                statusCode={500}
                title="Internal Server Error"
                description="Failed to load Spark dashboard data."
            />
        );
    }
}
