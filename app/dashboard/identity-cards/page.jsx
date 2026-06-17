import ErrorPage from "@/components/ErrorPage";
import IdentityCards from "@/components/IdentityCards";
import { fetchData } from "@/lib/utils";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const identityCardsPage = async () => {
  try {
    const headersList = await headers();
    const userHeader = headersList.get("x-user");
    const user = userHeader ? JSON.parse(userHeader) : null;
    const activeRole = headersList.get("x-active-role") || (user?.roles?.[0]);

    let [students, settings, classes, teachers] = await Promise.all([
      fetchData("users", "roles=Student&status=Active"),
      fetchData("settings"),
      fetchData("classes"),
      fetchData("users", "roles=Teacher"),
    ]);

    if (students && students.length > 0) {
      students = [...students].sort((a, b) => {
        const idA = a.studentSpecificField?.admissionNumber || a.admissionNumber || a._id;
        const idB = b.studentSpecificField?.admissionNumber || b.admissionNumber || b._id;
        return String(idA).localeCompare(String(idB), undefined, { numeric: true });
      });
    }

    return (
      <IdentityCards
        apiKey={process.env.API_KEY}
        students={students}
        settings={settings}
        institution={settings.institution}
        idCardBackgroundImageUrl={settings.idCard?.backgroundImage?.url}
        classes={classes}
        teachers={teachers}
        userRole={activeRole}
        allRoles={user?.roles || []}
        userId={user?._id}
      />
    );
  } catch (error) {
    console.error("Error loading identity card:", error.message);
    return (
      <ErrorPage
        statusCode={500}
        title="Internal Server Error"
        description="An unexpected error occurred while processing your request."
      />
    );
  }
};

export default identityCardsPage;
