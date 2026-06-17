"use client";
import dynamic from "next/dynamic";

const StudentAttendanceLookup = dynamic(
    () => import("./StudentAttendanceLookup"),
    { ssr: false, loading: () => null }
);

export default function StudentAttendanceLookupWrapper(props) {
    return <StudentAttendanceLookup {...props} />;
}
