
import connectToDB from "@/lib/db";
import User from "@/models/User";
import Batch from "@/models/Batch";

export async function getVerificationSummary() {
    await connectToDB();

    // Aggregate user data
    const stats = await User.aggregate([
        {
            $match: {
                roles: "Student",
                "studentSpecificField.batchId": { $exists: true, $ne: null },
            },
        },
        {
            $group: {
                _id: {
                    batchId: "$studentSpecificField.batchId",
                    status: "$studentSpecificField.status",
                },
                total: { $sum: 1 },
                verified: {
                    $sum: {
                        $cond: [{ $eq: ["$studentSpecificField.isVerified", true] }, 1, 0],
                    },
                },
            },
        },
    ]);

    // Fetch all batches to map names and ensure all are included
    const batches = await Batch.find({}).sort({ startYear: -1 }).lean();

    // Initialize summary for ALL batches
    const summaryMap = {};
    batches.forEach(batch => {
        summaryMap[batch._id.toString()] = {
            id: batch._id.toString(),
            name: batch.name,
            startYear: batch.startYear,
            endYear: batch.endYear,
            gb: { total: 0, verified: 0 },
            alumni: { total: 0, verified: 0 },
        };
    });

    // Populate data from aggregation
    stats.forEach((item) => {
        const batchId = item._id.batchId?.toString();
        const status = item._id.status;

        if (summaryMap[batchId]) {
            if (status === "Active" || status === "Graduated") {
                // GB includes Active and Graduated students
                summaryMap[batchId].gb.total += item.total;
                summaryMap[batchId].gb.verified += item.verified;
            } else if (status === "Dropped Out") {
                // Alumni includes only Dropped Out students
                summaryMap[batchId].alumni.total += item.total;
                summaryMap[batchId].alumni.verified += item.verified;
            }
        }
    });

    return Object.values(summaryMap).sort((a, b) => a.startYear - b.startYear); // Sort by startYear ascending (newest last)
}
