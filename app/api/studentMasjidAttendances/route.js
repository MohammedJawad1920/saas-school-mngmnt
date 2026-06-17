
import { apiResponse } from "@/lib/apiResponse";
import connectToDB from "@/lib/db";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(req, res) {
    try {
        await connectToDB();

        // Parse URL to get search params
        const url = new URL(req.url);
        const page = parseInt(url.searchParams.get("page") || "0");
        const limit = parseInt(url.searchParams.get("limit")) || Infinity;

        // Build filter object from query parameters
        const filterParams = {};
        for (const [key, value] of url.searchParams.entries()) {
            if (key !== "page" && key !== "limit" && key !== "projection") {
                filterParams[key] = value;
            }
        }

        // --- Document Query (User Level) ---
        const documentQuery = {
            roles: "Student",
            "studentSpecificField.status": "Active"
        };

        if (filterParams.studentId) {
            documentQuery._id = filterParams.studentId;
        }
        if (filterParams.classId) {
            documentQuery["studentSpecificField.classId"] = filterParams.classId;
        }
        if (filterParams.batchId) {
            documentQuery["studentSpecificField.batchId"] = filterParams.batchId;
        }

        // --- Lookup Matches (MasjidAttendance Level) ---
        const lookupMatch = {};

        if (filterParams.prayer) {
            lookupMatch.prayer = filterParams.prayer;
        }

        // Handle date filtering for lookup
        if (filterParams.date) {
            const exactDate = new Date(filterParams.date);
            const startOfDay = new Date(exactDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(exactDate);
            endOfDay.setHours(23, 59, 59, 999);
            lookupMatch.date = { $gte: startOfDay, $lte: endOfDay };
        } else if (filterParams.startDate || filterParams.endDate) {
            lookupMatch.date = {};
            if (filterParams.startDate) {
                const startDate = new Date(filterParams.startDate);
                startDate.setHours(0, 0, 0, 0);
                lookupMatch.date.$gte = startDate;
            }
            if (filterParams.endDate) {
                const endDate = new Date(filterParams.endDate);
                endDate.setHours(23, 59, 59, 999);
                lookupMatch.date.$lte = endDate;
            }
            // If date object is empty (no start/end provided but somehow matched), remove it
            if (Object.keys(lookupMatch.date).length === 0) delete lookupMatch.date;
        }

        console.log("Filters:", { documentQuery, lookupMatch });

        const pipeline = [
            // 1. Match Students (User)
            { $match: documentQuery },

            // 2. Lookup actual MasjidAttendance records
            {
                $lookup: {
                    from: "masjidattendances",
                    let: { studentId: { $toString: "$_id" } },
                    pipeline: [
                        // Match static filters (Date, Prayer)
                        { $match: lookupMatch },

                        // Match student availability in the array (optimization before unwind)
                        { $match: { $expr: { $in: ["$$studentId", "$attendanceData.studentId"] } } },

                        // Unwind to isolate the student's record
                        { $unwind: "$attendanceData" },

                        // Match specifically the student's record
                        { $match: { $expr: { $eq: ["$attendanceData.studentId", "$$studentId"] } } },

                        // Project needed fields
                        {
                            $project: {
                                _id: 1,
                                date: 1,
                                prayer: 1,
                                status: "$attendanceData.status",
                                present: { $eq: ["$attendanceData.status", "PRESENT"] }
                            }
                        }
                    ],
                    as: "attendanceRecords"
                }
            },

            // 3. Project Final Shape
            {
                $project: {
                    _id: 1,
                    name: 1,
                    studentId: { _id: "$_id", name: "$name" },
                    attendanceRecords: 1,
                }
            },

            // 4. Sort by ID (Ascending)
            { $sort: { _id: 1 } },

            // 5. Pagination
            { $skip: page * limit },
            ...(limit !== Infinity ? [{ $limit: limit }] : []),
        ];

        // Execute Aggregation on USER model
        const studentAttendances = await User.aggregate(pipeline).exec();

        // 6. Count Pipeline
        const countPipeline = [
            { $match: documentQuery },
            { $count: "total" }
        ];

        const countResult = await User.aggregate(countPipeline).exec();
        const total = countResult.length > 0 ? countResult[0].total : 0;

        return NextResponse.json(
            {
                studentMasjidAttendances: studentAttendances,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: limit === Infinity ? 1 : Math.max(0, Math.ceil(total / limit)),
                },
                message: "Student masjid attendance records fetched successfully",
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Student masjid attendance fetch error:", error);
        return apiResponse.error(error);
    }
}
