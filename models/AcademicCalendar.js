import mongoose from "mongoose";

const AcademicCalendarSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        date: { type: Date, required: true },
        time: { type: String, trim: true, default: "" },
        description: { type: String, trim: true, default: "" },
        type: {
            type: String,
            enum: ["Holiday", "Event", "Exam", "Activity", "Other"],
            default: "Event",
        },
        year: { type: Number, required: true },
    },
    { timestamps: true }
);

AcademicCalendarSchema.index({ date: 1 });
AcademicCalendarSchema.index({ year: 1 });

export default mongoose.models.AcademicCalendar ||
    mongoose.model("AcademicCalendar", AcademicCalendarSchema);
