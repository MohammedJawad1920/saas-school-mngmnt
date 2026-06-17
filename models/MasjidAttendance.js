import mongoose from "mongoose";

const masjidAttendanceSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: true,
            index: true,
        },
        day: {
            type: String,
            required: true,
        },
        prayer: {
            type: String,
            required: true,
            enum: ["ZUHR", "ASAR", "MAGRIB", "ISHA", "SUBH"],
        },
        classId: {
            type: String,
            ref: "Class",
            required: true,
        },
        batchId: {
            type: String,
            ref: "Batch",
            required: true,
        },
        markedBy: {
            type: String,
            ref: "User",
            required: true,
        },
        attendanceData: [
            {
                studentId: {
                    type: String,
                    ref: "User",
                    required: true,
                },
                status: {
                    type: String,
                    enum: ["PRESENT", "ABSENT", "LEAVE"],
                    default: "PRESENT",
                },
                remarks: {
                    type: String,
                    default: "",
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Compound index to prevent duplicate attendance for the same class, prayer, and date
masjidAttendanceSchema.index({ date: 1, prayer: 1, classId: 1 }, { unique: true });

// Force model rebuild to pick up schema changes
if (mongoose.models.MasjidAttendance) {
    delete mongoose.models.MasjidAttendance;
}

const MasjidAttendance =
    mongoose.models.MasjidAttendance ||
    mongoose.model("MasjidAttendance", masjidAttendanceSchema);

export default MasjidAttendance;
