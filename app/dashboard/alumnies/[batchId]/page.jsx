import Batch from "@/models/Batch";
import Class from "@/models/Class";
import User from "@/models/User";
import connectToDB from "@/lib/db";
import BatchDetailsClient from "./BatchDetailsClient";
import ErrorPage from "@/components/ErrorPage";

async function getBatch(batchId) {
    await connectToDB();
    const batch = await Batch.findById(batchId).lean();
    if (!batch) return null;

    // Calculate academic year
    const academicYear = `${batch.startYear}-${(batch.endYear % 100)
        .toString()
        .padStart(2, "0")}`;

    // Aggregate student counts for this specific batch
    const stats = await User.aggregate([
        {
            $match: {
                roles: "Student",
                "studentSpecificField.batchId": batch._id
            }
        },
        {
            $group: {
                _id: "$studentSpecificField.batchId",
                gbMembers: {
                    $sum: {
                        $cond: [
                            {
                                $in: ["$studentSpecificField.status", ["Active", "Graduated"]]
                            },
                            1,
                            0
                        ],
                    },
                },
                alumniMembers: {
                    $sum: {
                        $cond: [
                            { $eq: ["$studentSpecificField.status", "Dropped Out"] },
                            1,
                            0
                        ],
                    },
                },
            },
        },
    ]);

    const batchStats = stats[0] || { gbMembers: 0, alumniMembers: 0 };

    return {
        ...batch,
        _id: batch._id.toString(),
        academicYear,
        gbMembers: batchStats.gbMembers,
        alumniMembers: batchStats.alumniMembers,
    };
}

export default async function BatchDetailsPage({ params }) {
    try {
        const { batchId } = await params;
        const batch = await getBatch(batchId);

        await connectToDB();
        const classes = await Class.find().sort({ order: 1 }).lean();
        const serializedClasses = classes.map(c => ({ ...c, _id: c._id.toString() }));

        const apiKey = process.env.API_KEY;

        if (!batch) {
            return (
                <ErrorPage
                    statusCode={404}
                    title="Batch Not Found"
                    description="The requested batch could not be found."
                />
            );
        }

        return <BatchDetailsClient batch={batch} classes={serializedClasses} apiKey={apiKey} />;
    } catch (error) {
        console.error("Error loading batch details:", error);
        return (
            <ErrorPage
                statusCode={500}
                title="Internal Server Error"
                description="Failed to load batch details."
            />
        );
    }
}
