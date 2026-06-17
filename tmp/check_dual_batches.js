import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC";

async function checkOverlaps() {
    try {
        await mongoose.connect(MONGODB_URI);
        const FundSchema = new mongoose.Schema({}, { strict: false });
        const StudentsFund = mongoose.model('StudentsFund', FundSchema, 'studentsfunds');
        const UserSchema = new mongoose.Schema({ _id: String }, { strict: false });
        const User = mongoose.model('User', UserSchema, 'users');
        
        const teacherId = "TCH-002"; // Abdulla Saadi
        
        // Find all student funds for this teacher that have a studentId
        const funds = await StudentsFund.find({ teacherId, studentId: { $exists: true } }).lean();
        
        const studentBatchMap = {}; // studentId -> Set of batchIds
        
        funds.forEach(f => {
            if (!studentBatchMap[f.studentId]) {
                studentBatchMap[f.studentId] = new Set();
            }
            studentBatchMap[f.studentId].add(f.batchId);
        });
        
        console.log("Students with multiple batches for same teacher:");
        for (const [studentId, batches] of Object.entries(studentBatchMap)) {
            if (batches.size > 1) {
                const student = await User.findById(studentId).lean();
                console.log(`Student: ${student?.name} (${studentId}) - Batches: ${Array.from(batches).join(', ')}`);
                console.log(`Current Batch: ${student?.studentSpecificField?.batchId}`);
            }
        }

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkOverlaps();
