import { Schema, model, models } from "mongoose";

const gatePassSchema = new Schema(
    {
        studentId: {
            type: String,
            required: true,
            ref: "User",
            uppercase: true,
            trim: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["IN", "OUT"],
            required: true,
        },
        reason: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Confirmed", "Expired"],
            default: "Pending",
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        expiresAt: {
            type: Date,
        },
        confirmedAt: {
            type: Date,
        },
        allowedBy: {
            type: String,
            ref: "User",
        },
        recordedBy: {
            type: String,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

if (models.GatePass) {
    delete models.GatePass;
}
const GatePass = model("GatePass", gatePassSchema);
export default GatePass;
