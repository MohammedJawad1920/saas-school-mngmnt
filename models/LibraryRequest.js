import mongoose from "mongoose";

const libraryRequestSchema = new mongoose.Schema({
    bookId: { type: String, ref: "LibraryBook", required: true },
    studentId: { type: String, ref: "User", required: true },
    status: { 
        type: String, 
        enum: ["Pending", "Approved", "Rejected"], 
        default: "Pending" 
    },
    requestDate: { type: Date, default: Date.now }
}, { timestamps: true });

const LibraryRequest = mongoose.models.LibraryRequest || mongoose.model("LibraryRequest", libraryRequestSchema);

export default LibraryRequest;
