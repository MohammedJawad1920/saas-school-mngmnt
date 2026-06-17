import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Please define the MONGODB_URI environment variable inside .env.local");
    process.exit(1);
}

const SettingsSchema = new mongoose.Schema(
    {
        org: {
            committeePosters: [
                {
                    year: Number,
                    poster: {
                        url: String,
                        publicId: String
                    }
                }
            ]
        }
    },
    { strict: false }
);

const Settings = mongoose.models.Settings || mongoose.model("Settings", SettingsSchema);

async function checkSettings() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to DB");

        const settings = await Settings.findOne({});
        console.log("Settings found:", settings ? "Yes" : "No");

        if (settings) {
            // Safe access
            const org = settings.get('org');
            console.log("Org Data in DB:", JSON.stringify(org, null, 2));

            if (org && org.committeePosters) {
                console.log("Committee Posters Count:", org.committeePosters.length);
            } else {
                console.log("No committeePosters field in org");
            }
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

checkSettings();
