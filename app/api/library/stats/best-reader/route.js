import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Rental from "@/models/Rental";
import User from "@/models/User"; // Ensure User model is registered
import mongoose from "mongoose";

export async function GET(req) {
    try {
        await connectToDB();

        const url = new URL(req.url);
        const month = parseInt(url.searchParams.get("month")); // 0-11
        const year = parseInt(url.searchParams.get("year"));

        if (isNaN(month) || isNaN(year)) {
            return NextResponse.json({ success: false, msg: "Invalid month or year", data: {} }, { status: 400 });
        }

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        const stats = await Rental.aggregate([
            {
                $match: {
                    rentedDate: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $group: {
                    _id: "$studentId", // Group by student reference string/ObjectId
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 1
            }
        ]);

        if (stats.length === 0) {
            const totalCount = await Rental.countDocuments();
            return NextResponse.json({
                success: true,
                msg: "No rentals found for this period",
                data: null,
                debug: {
                    searchMonth: month,
                    searchYear: year,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    totalRentalsInCollection: totalCount,
                    sampleRental: totalCount > 0 ? await Rental.findOne() : "None"
                }
            }, { status: 200 });
        }

        // stats[0] is { _id: "studentId", count: N }
        // We need to fetch user details. The _id in group is the studentId string from Rental.
        // It might be an ObjectId string or just string depending on schema.

        const bestReaderId = stats[0]._id;


        // Let's re-fetch with populate to be clean
        console.log("Best Reader ID:", bestReaderId);

        const bestReaderPopulated = await User.findById(bestReaderId)
            .select("name profilePic roles studentSpecificField")
            .populate("studentSpecificField.classId", "name"); // Assuming structure

        console.log("Best Reader Found:", bestReaderPopulated);

        const studentData = bestReaderPopulated || {
            name: `Unknown (ID: ${bestReaderId})`,
            profilePic: null,
            studentSpecificField: { classId: { name: "Unknown" } }
        };

        return NextResponse.json({
            success: true,
            data: {
                student: studentData,
                count: stats[0].count
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching best reader:", error);
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}
