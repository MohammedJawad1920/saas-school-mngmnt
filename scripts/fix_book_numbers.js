
import mongoose from "mongoose";
import connectToDB from "../lib/db.js";
import LibraryBook from "../models/LibraryBook.js";

async function fixNumbers() {
    try {
        await connectToDB();
        console.log("Connected to database");

        // Find all books where ID starts with BG
        const books = await LibraryBook.find({ id: /^BG/ });
        console.log(`Found ${books.length} books to fix.`);

        let count = 0;
        for (const book of books) {
            // Set number to match ID (e.g., set number to "BG01" instead of "01")
            book.number = book.id;
            await book.save();
            count++;
            if (count % 50 === 0) {
                console.log(`Fixed ${count} books...`);
            }
        }

        console.log(`Successfully fixed ${count} books.`);
        process.exit(0);
    } catch (error) {
        console.error("Error fixing book numbers:", error);
        process.exit(1);
    }
}

fixNumbers();
