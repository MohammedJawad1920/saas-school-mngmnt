import mongoose from "mongoose";

const rentalSchema = new mongoose.Schema({
    bookId: { type: String, ref: "LibraryBook" },
    studentId: { type: String, ref: "User" },
    studentName: String,
    rentedDate: Date,
    receivedDate: Date
}, { timestamps: true });

const Rental = mongoose.models.Rental || mongoose.model("Rental", rentalSchema);

export default Rental;
