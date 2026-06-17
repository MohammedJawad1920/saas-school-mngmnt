import connectToDB from "../lib/db.js";
import Settings from "../models/Settings.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function test() {
  try {
    await connectToDB();
    console.log("Connected to DB");

    let settings = await Settings.findOne({});
    if (!settings) {
      console.log("No settings found, creating one...");
      settings = new Settings({
        institution: {
          name: "Test Institution",
        }
      });
    }

    settings.institution.contact.facebook = "https://facebook.com/test";
    settings.institution.contact.youtube = "https://youtube.com/test";
    settings.institution.contact.instagram = "https://instagram.com/test";

    await settings.save();
    console.log("Settings saved successfully");

    const updatedSettings = await Settings.findOne({});
    console.log("Facebook:", updatedSettings.institution.contact.facebook);
    console.log("YouTube:", updatedSettings.institution.contact.youtube);
    console.log("Instagram:", updatedSettings.institution.contact.instagram);

    if (updatedSettings.institution.contact.facebook === "https://facebook.com/test") {
      console.log("VERIFICATION SUCCESSFUL");
    } else {
      console.log("VERIFICATION FAILED");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

test();
