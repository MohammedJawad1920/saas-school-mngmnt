import FacultyProfileCard from "@/components/FacultyProfileCard";
import Header from "@/components/Header";
import ErrorPage from "@/components/ErrorPage";
import { fetchData } from "@/lib/utils";

export default async function FacultyPage() {
  try {
    const teachers = await fetchData(
      "users",
      "projection=_id,name,email,profilePic,contactNumber,dateOfBirth,address,place&roles=Teacher&status=Active"
    );

    const classes = await fetchData("classes");

    // Sort teachers by date of birth (age seniority) - oldest first
    teachers.sort((a, b) => new Date(a.dateOfBirth) - new Date(b.dateOfBirth));

    return (
      <div className="flex flex-col space-y-6">
        <Header
          title="FACULTY PROFILES"
          subTitle="View active teaching staff profile and information"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teachers?.map((teacher) => {
            const assignedClass =
              classes.find((c) => c.teacherId === teacher._id)?.name ||
              "No Class Assigned";
            return (
              <FacultyProfileCard
                key={teacher._id}
                faculty={teacher}
                assignedClass={assignedClass}
              />
            );
          })}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading faculty:", error.message);
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
