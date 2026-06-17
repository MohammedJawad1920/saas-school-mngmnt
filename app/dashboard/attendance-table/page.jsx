import { cookies } from "next/headers";
import AttendanceTableReport from "@/components/AttendanceTableReport";
import Header from "@/components/Header";
import { fetchData } from "@/lib/utils";
import ErrorPage from "@/components/ErrorPage";

async function getClasses() {
  try {
    const classes = await fetchData("classes");
    return classes;
  } catch (error) {
    console.error("Error fetching classes:", error);
    return [];
  }
}

export default async function AttendanceTablePage() {
  const cookieStore = await cookies();
  const activeRole = cookieStore.get("active-role")?.value;

  if (activeRole !== "College Admin") {
    return (
      <ErrorPage
        statusCode={403}
        title="Access Denied"
        description="You do not have permission to view this page."
      />
    );
  }
  const classes = await getClasses();

  return (
    <div className="flex flex-col">
      <div className="print:hidden">
        <Header
          title="ATTENDANCE TABLE"
          subTitle="Monthly attendance table for each class"
        />
      </div>
      <AttendanceTableReport classes={classes} />
    </div>
  );
}
