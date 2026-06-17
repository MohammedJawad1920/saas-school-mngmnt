import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async () => {
    if (mongoose.connections[0].readyState) return;
    await mongoose.connect(process.env.MONGODB_URI);
};

const classSchema = new mongoose.Schema({
    name: String,
    status: String,
    batchId: mongoose.Schema.Types.ObjectId,
});

const Class = mongoose.models.Class || mongoose.model("Class", classSchema);

const checkClasses = async () => {
    try {
        await connectDB();
        console.log("Connected to DB");

        const allClasses = await Class.find({});
        console.log(`Total classes found: ${allClasses.length}`);

        const activeClasses = await Class.find({ status: "Active" });
        console.log(`Active classes found: ${activeClasses.length}`);

        if (activeClasses.length > 0) {
            console.log("First active class:", activeClasses[0]);
        } else {
            console.log("Sample of classes:", allClasses.slice(0, 3));
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

checkClasses();
