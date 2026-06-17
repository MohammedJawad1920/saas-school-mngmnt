import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Rental from "@/models/Rental";
import LibraryBook from "@/models/LibraryBook";
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
                    _id: "$bookId", // Group by book reference string/ObjectId
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
            return NextResponse.json({ success: true, msg: "No rentals found for this period", data: null }, { status: 200 });
        }

        const mostReadBookId = stats[0]._id;
        const mostReadBook = await LibraryBook.findById(mostReadBookId);

        return NextResponse.json({
            success: true,
            data: {
                book: mostReadBook,
                count: stats[0].count
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching most read book:", error);
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}
