import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC";

async function search() {
    try {
        await mongoose.connect(MONGODB_URI);
        const UserSchema = new mongoose.Schema({}, { strict: false });
        const User = mongoose.model('User', UserSchema, 'users');
        
        const abdullas = await User.find({ name: /Abdulla/i }).lean();
        const stationaryStaff = await User.find({ roles: "Stationary" }).lean();
        
        console.log("Abdullas:", JSON.stringify(abdullas, null, 2));
        console.log("Stationary Staff:", JSON.stringify(stationaryStaff, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

search();
