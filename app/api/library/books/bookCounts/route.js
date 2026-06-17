import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import LibraryBook from "@/models/LibraryBook";
import Rental from "@/models/Rental";

const validateApiKey = (req) => {
    const url = new URL(req.url);
    const apiKey = req.headers.get("api-key") || url.searchParams.get("apiKey");
    return !!apiKey;
};

export async function GET(req) {
    try {
        await connectToDB();
        if (!validateApiKey(req)) {
            return NextResponse.json({ success: false, msg: "Invalid API Key", data: {} }, { status: 401 });
        }

        const totalBooks = await LibraryBook.countDocuments();
        const rentedBooks = await LibraryBook.countDocuments({ status: "Rented" });

        const returnedRentals = await Rental.countDocuments({ receivedDate: { $ne: null } });
        const pendingRentals = await Rental.countDocuments({ receivedDate: null });

        const availableBooks = totalBooks - pendingRentals;

        const data = {
            total: totalBooks,
            available: availableBooks,
            rented: rentedBooks,
            returnedRentals,
            pendingRentals
        };

        return NextResponse.json({ success: true, msg: "Book counts fetched successfully", data: data }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}
