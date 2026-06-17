import mongoose from "mongoose";

const libraryBookSchema = new mongoose.Schema({
    id: String,
    prefix: String,
    number: String,
    name: String,
    author: String,
    category: String,
    language: String,
    status: { type: String, default: "Available" },
    publication: String,
    price: Number
}, { timestamps: true });

delete mongoose.models.LibraryBook;
const LibraryBook = mongoose.models.LibraryBook || mongoose.model("LibraryBook", libraryBookSchema);

export default LibraryBook;
