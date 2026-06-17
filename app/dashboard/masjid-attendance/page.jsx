import MasjidDashboard from "@/components/masjid-attendance/MasjidDashboard";
import { headers } from "next/headers";
import connectDB from "@/lib/db";
import Class from "@/models/Class";
import { sortClasses, parseUser } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MasjidAttendancePage = async () => {
    const apiKey = process.env.API_KEY;
    const headerStore = await headers();
    const user = parseUser(headerStore);

    await connectDB();
    // Fetch only active classes (including those without a status explicitly set to Closed)
    // We serialize the data to pass it to the client component
    const classes = await Class.find({ status: { $ne: "Closed" } })
        .select("_id name batchId")
        .populate("batchId", "name")
        .lean();

    console.log("Fetched Active Classes Count:", classes.length);
    if (classes.length > 0) {
        console.log("First Class:", classes[0]);
    } else {
        console.log("No active classes found.");
    }

    // Sort by class ID order using localeCompare with numeric: true
    classes.sort((a, b) => String(a._id).localeCompare(String(b._id), undefined, { numeric: true }));

    const serializedClasses = classes.map((cls) => ({
        _id: cls._id.toString(),
        name: cls.name,
        batchId: cls.batchId?._id?.toString(),
        batchName: cls.batchId?.name,
    }));

    return <MasjidDashboard classes={serializedClasses} apiKey={apiKey} />;
};

export default MasjidAttendancePage;
