import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC";

async function checkFunds() {
    try {
        await mongoose.connect(MONGODB_URI);
        const FundSchema = new mongoose.Schema({}, { strict: false });
        const StudentsFund = mongoose.model('StudentsFund', FundSchema, 'studentsfunds');
        
        // Find one record where teacherId is "708" or studentId is "708" to see the data
        const fundsByHusain = await StudentsFund.find({ teacherId: "708" }).limit(5).lean();
        const fundsForHusain = await StudentsFund.find({ studentId: "708" }).limit(5).lean();
        
        console.log("Funds Managed by Husain:", JSON.stringify(fundsByHusain, null, 2));
        console.log("Funds for Husain:", JSON.stringify(fundsForHusain, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkFunds();
