import ErrorPage from "@/components/ErrorPage";
import Dashboard from "@/components/Dashboard";
import StudentDashboard from "@/components/StudentDashboard";
import { fetchData, WEEKDAYS } from "@/lib/utils";
import { cookies, headers } from "next/headers";
import FestDashboard from "@/components/FestDashboard";
import SparkDashboardClient from "./spark/SparkDashboardClient";
import { getSparkStats } from "@/libservices/spark-services";

const today = new Date();
const istTime = new Date(today.getTime() + 5.5 * 60 * 60 * 1000);

const currentDay = WEEKDAYS[istTime.getDay()];

const API_ENDPOINTS = [
  {
    pathname: "classes",
  },
  {
    pathname: "batches",
  },
  {
    pathname: "users",
    searchParams:
      "projection=_id,name,email,profilePic,contactNumber,dateOfBirth,address&roles=Teacher&status=Active",
  },

  {
    pathname: "periods",
  },
  {
    pathname: "attendances",
    searchParams: `date=${istTime.toISOString().split("T")[0]}`,
  },
  {
    pathname: "settings",
    revalidate: 0,
  },
  {
    pathname: "leave-records",
    searchParams: "isArrived=false",
    key: "leave-records",
  },
  {
    pathname: "teachers-leave-record",
    searchParams: `date=${istTime.toISOString().split("T")[0]}`,
    key: "teachersLeaveRecord",
  },
  {
    pathname: "updates",
    searchParams: "limit=10",
    key: "updates",
  },
];

export default async function DashboardPage() {
  try {
    const cookieStore = await cookies();
    const activeRole = cookieStore.get("active-role")?.value;
    const apiKey = process.env.API_KEY;

    if (["Program Committee", "Program Leader"].includes(activeRole)) {
      return <FestDashboard />;
    }

    if (activeRole === "Spark Admin") {
      try {
        const stats = await getSparkStats();
        return <SparkDashboardClient {...stats} />;
      } catch (error) {
        console.error("Error loading spark stats:", error);
        // Fallback or better error handling if needed, 
        // but error boundary should catch it.
      }
    }

    const [
      classes,
      batches,
      teachers,
      periods,
      attendances,
      settings,
      leaveRecords,
      teachersLeaveRecord,
      updatesData,
    ] = await Promise.all(
      API_ENDPOINTS.map((endpoint) =>
        fetchData(
          endpoint.pathname,
          endpoint.searchParams,
          endpoint.revalidate,
          endpoint.key
        )
      )
    );

    const filteredLeaveRecords = leaveRecords.filter(
      (record) => record.studentStatus === "Active"
    );

    if (activeRole === "Student") {
      const headersList = headers();
      const user = JSON.parse(headersList.get("x-user"));
      const userId = user._id || user.id;
      
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const debtsRaw = await fetch(`${baseUrl}/api/debtors?studentId=${userId}`)
        .then(r => r.json())
        .catch(() => ({ debts: [] }));

      const debtBalances = (debtsRaw.debts || [])
        .filter(d => (d.totalAmount - (d.payments || []).reduce((s, p) => s + p.amount, 0)) > 0)
        .map(d => ({
          category: d.category,
          year: d.year,
          balance: d.totalAmount - (d.payments || []).reduce((s, p) => s + p.amount, 0),
        }));

      const updates = Array.isArray(updatesData) ? updatesData : updatesData?.updates || [];
      return <StudentDashboard user={user} apiKey={apiKey} classes={classes} batches={batches} updates={updates} debtBalances={debtBalances} />;
    }

    return (
      <Dashboard
        apiKey={apiKey}
        classes={classes}
        batches={batches}
        teachers={teachers}
        periods={periods}
        attendances={attendances}
        settings={settings}
        activeRole={activeRole}
        leaveRecords={filteredLeaveRecords}
        teachersLeaveRecord={teachersLeaveRecord}
      />
    );
  } catch (error) {
    console.error("Error loading batches:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
}

export const revalidate = 60;
