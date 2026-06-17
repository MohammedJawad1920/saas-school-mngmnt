import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC";

async function clearHusainFunds() {
    try {
        await mongoose.connect(MONGODB_URI);
        const FundSchema = new mongoose.Schema({}, { strict: false });
        const StudentsFund = mongoose.model('StudentsFund', FundSchema, 'studentsfunds');
        
        const teacherId = "708"; // Husain
        
        const result = await StudentsFund.updateMany(
            { teacherId },
            { 
                $set: { 
                    balance: 0, 
                    transactions: [] 
                } 
            }
        );
        
        console.log(`Successfully cleared ${result.modifiedCount} fund records for teacher ${teacherId}.`);

    } catch (error) {
        console.error("Error clearing funds:", error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

clearHusainFunds();
