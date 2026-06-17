import connectToDB from "../lib/db.js";
import User from "../models/User.js";

async function debug() {
    try {
        await connectToDB();
        console.log("Connected to DB");

        const user = await User.findOne({ roles: "Student" });
        if (user) {
            console.log("Found a student:", user._id);
            console.log("Address object:", JSON.stringify(user.address, null, 2));
            
            // Try to set locationPoint
            user.address.locationPoint = "Test Location";
            user.markModified("address");
            await user.save();
            console.log("Successfully saved locationPoint to student");
            
            const updatedUser = await User.findById(user._id);
            console.log("Updated Address object:", JSON.stringify(updatedUser.address, null, 2));
        } else {
            console.log("No student found");
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit();
    }
}

debug();
