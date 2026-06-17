import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC";

async function checkFunds() {
    try {
        await mongoose.connect(MONGODB_URI);
        const BatchSchema = new mongoose.Schema({}, { strict: false });
        const Batch = mongoose.model('Batch', BatchSchema, 'batches');
        
        const nineaBatch = await Batch.findOne({ name: /NINEA/i }).lean();
        console.log("NINEA Batch ID:", nineaBatch?._id);
        
        const teacherId = "TCH-002"; // Abdulla Saadi
        
        const FundSchema = new mongoose.Schema({}, { strict: false });
        const StudentsFund = mongoose.model('StudentsFund', FundSchema, 'studentsfunds');
        
        if (nineaBatch) {
            const fundsInNinea = await StudentsFund.find({ 
                teacherId, 
                batchId: nineaBatch._id,
                studentId: { $exists: true }
            }).lean();
            
            console.log(`Found ${fundsInNinea.length} students fund records for teacher in batch ${nineaBatch._id}`);
            
            // Check if these students are currently in this batch
            const UserSchema = new mongoose.Schema({
                _id: String
            }, { strict: false });
            const User = mongoose.model('User', UserSchema, 'users');
            
            for (const fund of fundsInNinea) {
                const student = await User.findById(fund.studentId).lean();
                if (student) {
                    const currentBatchId = student.studentSpecificField?.batchId;
                    if (currentBatchId !== nineaBatch._id) {
                        console.log(`MISMATCH: Student ${student.name} (${fund.studentId}) current batch is ${currentBatchId}, but has fund in ${nineaBatch._id}`);
                    }
                } else {
                    console.log(`STUDENT NOT FOUND: ${fund.studentId}`);
                }
            }
        }

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkFunds();
