import { config } from "dotenv";
import mongoose from "mongoose";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Please define the MONGODB_URI environment variable");
    process.exit(1);
}

// Minimal Schema to read settings
const SettingsSchema = new mongoose.Schema({}, { strict: false });
const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);

async function debugSettings() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        const settings = await Settings.findOne({});
        if (!settings) {
            console.log("No settings found");
        } else {
            console.log("Spark Committee Posters:", JSON.stringify(settings.spark?.committeePosters, null, 2));
            console.log("Org Committee Posters:", JSON.stringify(settings.org?.committeePosters, null, 2));
            // Log entire spark object to see if field exists
            console.log("Full Spark Object:", JSON.stringify(settings.spark, null, 2));
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected");
        process.exit(0);
    }
}

debugSettings();
