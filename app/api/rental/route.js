import { NextResponse } from "next/server";
import connectToDB from "@/lib/db";
import Rental from "@/models/Rental";
import LibraryBook from "@/models/LibraryBook";
import User from "@/models/User";
import mongoose from "mongoose";



export async function GET(req) {
    try {
        await connectToDB();
        // Middleware handles auth

        const url = new URL(req.url);
        const studentId = url.searchParams.get("studentId");
        const bookId = url.searchParams.get("bookId");
        const status = url.searchParams.get("status");

        const query = {};
        if (studentId) query.studentId = studentId;
        if (bookId) query.bookId = bookId;
        if (status === "pending") query.receivedDate = null;

        const rentals = await Rental.find(query)
            .populate("bookId")
            .populate("studentId", "name _id profilePic studentSpecificField")
            .sort({ createdAt: -1 });

        return NextResponse.json({ success: true, msg: "Rentals fetched successfully", data: rentals }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await connectToDB();
        // Middleware handles auth


        const body = await req.json();

        // If bookId is provided, check if it's a direct ID or a Book Number (from manual input)
        if (body.bookId) {
            // First try to find by number (Book ID can be alphanumeric)
            let book = await LibraryBook.findOne({ number: body.bookId });

            // If not found by number, and it looks like an ObjectId, try finding by ID (fallback)
            if (!book && mongoose.Types.ObjectId.isValid(body.bookId)) {
                book = await LibraryBook.findById(body.bookId);
            }

            if (!book) {
                return NextResponse.json({ success: false, msg: "Book not found", data: {} }, { status: 404 });
            }

            // Replace the input number with the actual Object ID
            body.bookId = book._id;

            // --- VALIDATION: Check if book is already rented ---
            const existingRental = await Rental.findOne({ bookId: book._id, receivedDate: null });
            if (existingRental) {
                return NextResponse.json({
                    success: false,
                    msg: `Book '${book.name}' is already rented to ${existingRental.studentName || 'another student'} and not yet returned.`,
                    data: {}
                }, { status: 400 });
            }
        }

        // Validate Student ID
        if (body.studentId) {
            // studentId is the _id string in User model
            // We need to `import User from "@/models/User";` at the top if not imported, 
            // but let's check imports first. Wait, I didn't verify imports in route.js view.
            // I'll assume I need to import User or use mongoose.models.User if lazy.
            // Better to check imports first or just add it if I am sure. 
            // Actually, let's just use `import User from "@/models/User";` in the imports section first 
            // OR use mongoose.model("User") if I want to be safe without top-level import modification right here.
            // But let's look at the file content I have from previous turns... 
            // `import LibraryBook` was there. `import User` was NOT.
            // I will add the import in a separate edit or use `mongoose.models.User`.
            // Let's use `mongoose.models.User` to avoid import issues for now, or add import safely.
            const User = mongoose.models.User || mongoose.model("User");
            const student = await User.findById(body.studentId);
            if (!student) {
                return NextResponse.json({ success: false, msg: "Student not found", data: {} }, { status: 404 });
            }
            // Optional: Populate studentName if needed, but schema has it. 
            // If the form doesn't send studentName, we can set it here.
            if (!body.studentName) {
                body.studentName = student.name;
            }
        }

        // Create rental
        const newRental = await Rental.create(body);

        // Update book status to Rented
        if (body.bookId) {
            await LibraryBook.findByIdAndUpdate(body.bookId, { status: "Rented" });
        }

        return NextResponse.json({ success: true, msg: "Rental created successfully", data: newRental }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        await connectToDB();
        // Middleware handles auth


        const body = await req.json();
        const { _id, receivedDate } = body;

        if (!_id) {
            return NextResponse.json({ success: false, msg: "Rental ID required", data: {} }, { status: 400 });
        }

        const updatedRental = await Rental.findByIdAndUpdate(_id, body, { new: true });

        // If receivedDate is set, mark book as Available
        if (receivedDate && updatedRental.bookId) {
            await LibraryBook.findByIdAndUpdate(updatedRental.bookId, { status: "Available" });
        }

        if (!updatedRental) {
            return NextResponse.json({ success: false, msg: "Rental not found", data: {} }, { status: 404 });
        }

        return NextResponse.json({ success: true, msg: "Rental updated successfully", data: updatedRental }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}

export async function DELETE(req) {
    try {
        await connectToDB();
        // Middleware handles auth


        const url = new URL(req.url);
        const id = url.searchParams.get("id");

        if (!id) {
            return NextResponse.json({ success: false, msg: "Rental ID required", data: {} }, { status: 400 });
        }

        const deletedRental = await Rental.findByIdAndDelete(id);

        if (!deletedRental) {
            return NextResponse.json({ success: false, msg: "Rental not found", data: {} }, { status: 404 });
        }

        if (!deletedRental.receivedDate && deletedRental.bookId) {
            await LibraryBook.findByIdAndUpdate(deletedRental.bookId, { status: "Available" });
        }

        return NextResponse.json({ success: true, msg: "Rental deleted successfully", data: {} }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ success: false, msg: error.message, data: {} }, { status: 500 });
    }
}
