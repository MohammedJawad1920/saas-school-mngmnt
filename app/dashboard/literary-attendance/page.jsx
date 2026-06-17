import LiteraryAttendance from "@/components/LiteraryAttendance";
import { fetchData } from "@/lib/utils";

const API_ENDPOINTS = [
  {
    pathname: "users",
    searchParams: "projection=_id,name,profilePic&status=Active&roles=Student",
  },
  {
    pathname: "classes",
    searchParams: "status=Active",
  },
  {
    pathname: "literary/groups",
    key: "groups",
  },
];

const apiKey = process.env.API_KEY;
const literaryAttendancePage = async () => {
  const [students, classes, groups] = await Promise.all(
    API_ENDPOINTS.map((endpoint) =>
      fetchData(
        endpoint.pathname,
        endpoint.searchParams,
        endpoint.revalidate,
        endpoint.key
      )
    )
  );
  return (
    <LiteraryAttendance
      students={students}
      classes={classes}
      groups={groups}
      apiKey={apiKey}
    />
  );
};

export default literaryAttendancePage;
export const revalidate = 60;
