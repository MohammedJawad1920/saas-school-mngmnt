import mongoose from "mongoose";

const MarkSchema = new mongoose.Schema(
    {
        examName: { type: String, required: true },
        classId: { type: String, ref: "Class", required: false }, // kept for backward compat
        classIds: [{ type: String }], // multi-class support
        subjects: [
            {
                name: { type: String, required: true },
                maxMark: { type: Number, default: 100 },
                passMark: { type: Number, default: 40 },
                subColumns: [
                    {
                        name: { type: String, required: true },
                        maxMark: { type: Number, default: 100 },
                        passMark: { type: Number, default: 40 },
                    }
                ],
            },
        ],
        students: [
            {
                studentId: { type: String, ref: "User" }, // String, matches User _id type
                marks: { type: mongoose.Schema.Types.Mixed },
                manualRemark: { type: String, default: "" },
            },
        ],
        gradingScale: [
            {
                min: { type: Number, required: true },
                max: { type: Number, required: true },
                remark: { type: String, required: true },
            },
        ],
    },
    { timestamps: true }
);

if (mongoose.models.Mark) {
    delete mongoose.models.Mark;
}

export default mongoose.model("Mark", MarkSchema);
