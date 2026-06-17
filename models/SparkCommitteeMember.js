import { Schema, model, models } from "mongoose";

const sparkCommitteeMemberSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        designation: {
            type: String,
            trim: true,
        },
        place: {
            type: String,
            trim: true,
        },
        photo: {
            url: {
                type: String,
                trim: true,
            },
            publicId: {
                type: String,
                trim: true,
            },
        },
        // Optional: Add order/priority for display sorting
        order: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const SparkCommitteeMember =
    models.SparkCommitteeMember || model("SparkCommitteeMember", sparkCommitteeMemberSchema);

export default SparkCommitteeMember;
