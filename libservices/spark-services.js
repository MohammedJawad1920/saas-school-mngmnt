
import User from "@/models/User";
import Batch from "@/models/Batch";
import Settings from "@/models/Settings";
import connectToDB from "@/lib/db";

export async function getSparkStats() {
    await connectToDB();

    // 1. Total Alumnies (Dropped Out)
    const totalAlumnies = await User.countDocuments({
        roles: "Student",
        "studentSpecificField.status": "Dropped Out",
    });

    const settings = await Settings.findOne({});
    const sparkLogo = settings?.spark?.logo?.url || "/images/spark-logo.jpg";

    // 2. Total GB Members (Active + Graduated)
    const totalGBMembers = await User.countDocuments({
        roles: "Student",
        "studentSpecificField.status": { $in: ["Active", "Graduated"] },
    });

    // 3a. Batch-wise Distribution of GB Members
    const gbBatchStats = await User.aggregate([
        {
            $match: {
                roles: "Student",
                "studentSpecificField.status": { $in: ["Active", "Graduated"] },
            },
        },
        {
            $group: {
                _id: "$studentSpecificField.batchId",
                count: { $sum: 1 },
            },
        },
    ]);

    // 3b. Batch-wise Distribution of Alumni Members (Dropped Out)
    const alumniBatchStats = await User.aggregate([
        {
            $match: {
                roles: "Student",
                "studentSpecificField.status": "Dropped Out",
            },
        },
        {
            $group: {
                _id: "$studentSpecificField.batchId",
                count: { $sum: 1 },
            },
        },
    ]);

    // Fetch batch names
    const batches = await Batch.find({}, { name: 1, startYear: 1, endYear: 1 }).lean();
    const batchMap = batches.reduce((acc, batch) => {
        acc[batch._id.toString()] = batch;
        return acc;
    }, {});

    const processBatchStats = (stats) => {
        return stats
            .map((stat) => {
                const batch = batchMap[stat._id?.toString()];
                const academicYear = batch
                    ? `${batch.startYear}-${(batch.endYear % 100).toString().padStart(2, "0")}`
                    : "N/A";

                return {
                    name: batch ? batch.name.toUpperCase() : "UNKNOWN",
                    count: stat.count,
                    startYear: batch ? batch.startYear : 0,
                    academicYear,
                };
            })
            .sort((a, b) => a.startYear - b.startYear);
    };

    const batchDistribution = processBatchStats(gbBatchStats);
    const alumniBatchDistribution = processBatchStats(alumniBatchStats);

    return {
        totalAlumnies,
        totalGBMembers,
        batchDistribution, // GB Members
        alumniBatchDistribution, // Alumni Members
        sparkLogo,
    };
}
