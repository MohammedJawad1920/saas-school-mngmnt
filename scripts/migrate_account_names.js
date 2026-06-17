import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("MONGODB_URI not found");
    process.exit(1);
}

const financeSchema = new mongoose.Schema(
    {
        date: { type: Date, required: true },
        type: { type: String, enum: ["Income", "Expense"], required: true },
        invoiceNo: { type: String, required: true },
        item: { type: String, required: false },
        recipient: { type: String, required: false },
        category: { type: String, required: true },
        amount: { type: Number, required: true },
        mode: { type: String, enum: ["Cash", "Bank"], required: true },
        accountType: { type: String, enum: ["College", "Org", "Spark"], default: "College", required: true, index: true },
        accountName: { type: String, required: false, index: true },
    },
    { timestamps: true }
);

const Finance = mongoose.models.Finance || mongoose.model("Finance", financeSchema);

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        const result = await Finance.updateMany(
            { accountType: "Org", accountName: { $in: [null, ""] } },
            { $set: { accountName: "2025-26" } }
        );

        console.log(`Migration Complete: Updated ${result.modifiedCount} transactions to '2025-26'.`);
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

run();
