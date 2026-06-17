import Batch from "@/models/Batch";
import Link from "next/link";
import User from "@/models/User";
import connectToDB from "@/lib/db";
import Header from "@/components/Header";
import { GraduationCap } from "lucide-react";
import ErrorPage from "@/components/ErrorPage";

async function getBatchStats() {
    await connectToDB();

    // Fetch all batches sorted by start year
    const batches = await Batch.find().sort({ startYear: 1 }).lean();

    // Aggregate student counts by batch and status
    const stats = await User.aggregate([
        { $match: { roles: "Student" } },
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

    // Create a map for easy lookup
    const statsMap = stats.reduce((acc, curr) => {
        acc[curr._id] = curr;
        return acc;
    }, {});

    // Merge batch info with stats
    // Use Promise.all if we had async operations inside, but map is fine here
    return batches.map((batch) => {
        // Calculate dynamic academic year just in case virtuals aren't available in lean() without explicit options
        // But lean() usually strips virtuals unless configured. 
        // Let's re-calculate academicYear for safety since virtuals are not in lean() by default for this Mongoose version usually
        const academicYear = `${batch.startYear}-${(batch.endYear % 100)
            .toString()
            .padStart(2, "0")}`;

        const batchStats = statsMap[batch._id.toString()] || {
            gbMembers: 0,
            alumniMembers: 0,
        };

        return {
            ...batch,
            _id: batch._id.toString(),
            academicYear,
            gbMembers: batchStats.gbMembers,
            alumniMembers: batchStats.alumniMembers,
        };
    });
}

import { cookies } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ... (existing imports)

export default async function AlumniesPage() {
    try {
        const batches = await getBatchStats();
        const cookieStore = await cookies();
        const activeRole = cookieStore.get("active-role")?.value;

        // Calculate Totals
        const totalGB = batches.reduce((acc, batch) => acc + batch.gbMembers, 0);
        const totalAlumni = batches.reduce((acc, batch) => acc + batch.alumniMembers, 0);

        return (
            <div className="flex flex-col space-y-6">
                <Header
                    title="ALUMNIES"
                    subTitle="Alumni Network & Directory"
                    icon={<GraduationCap className="h-5 w-5 text-muted-foreground" />}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total GB Members
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalGB}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Total Alumni Members
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalAlumni}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {batches.map((batch) => {
                        const CardContent = (
                            <>
                                <h3 className="font-bold text-lg uppercase">
                                    {batch.name} ({batch.academicYear})
                                </h3>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p>
                                        GB Members: <span className="font-medium text-foreground">{batch.gbMembers}</span>
                                    </p>
                                    <p>
                                        Alumni Members: <span className="font-medium text-foreground">{batch.alumniMembers}</span>
                                    </p>
                                </div>
                            </>
                        );

                        const cardClasses = "bg-secondary text-card-foreground p-6 rounded-lg shadow-sm border border-border dark:border-white/15 dark:shadow-md flex flex-col items-center justify-center text-center space-y-2 hover:bg-accent hover:shadow-md transition-all block w-full h-full";

                        if (activeRole === "Student") {
                            return (
                                <div key={batch._id} className={cardClasses}>
                                    {CardContent}
                                </div>
                            );
                        }

                        return (
                            <Link
                                href={`/dashboard/alumnies/${batch._id}`}
                                key={batch._id}
                                className={cardClasses}
                            >
                                {CardContent}
                            </Link>
                        );
                    })}
                </div>
                {batches.length === 0 && (
                    <div className="text-center p-12 text-muted-foreground">
                        No batches found.
                    </div>
                )}
            </div>
        );

    } catch (error) {
        console.error("Error loading alumni data:", error);
        return (
            <ErrorPage
                statusCode={500}
                title="Internal Server Error"
                description="Failed to load alumni data."
            />
        );
    }
}

export const revalidate = 60;
