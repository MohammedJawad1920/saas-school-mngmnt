import mongoose from "mongoose";

const AccountNameSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    accountType: {
        type: String,
        required: true,
        enum: ["Org", "College", "Spark"], // Adjust if other types exist
        default: "Org"
    },
    userId: {
        type: String,
        required: false,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound unique index to prevent duplicate names per accountType and per user
AccountNameSchema.index({ name: 1, accountType: 1, userId: 1 }, { unique: true });

// Delete cached model so schema changes (enum updates etc.) always take effect
delete mongoose.models["AccountName"];
export default mongoose.model("AccountName", AccountNameSchema);
