import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://abdullakk:abdullakk3030@sdc.qw7au9k.mongodb.net/scofist?retryWrites=true&w=majority&appName=SDC";

async function checkDeptFunds() {
    try {
        await mongoose.connect(MONGODB_URI);
        const FundSchema = new mongoose.Schema({}, { strict: false });
        const StudentsFund = mongoose.model('StudentsFund', FundSchema, 'studentsfunds');
        const UserSchema = new mongoose.Schema({ _id: String }, { strict: false });
        const User = mongoose.model('User', UserSchema, 'users');
        
        // Find department funds
        const deptFunds = await StudentsFund.find({ fundType: "Department" }).limit(10).lean();
        
        console.log("Department Fund Records (Sample):");
        for (const fund of deptFunds) {
            console.log(`\nFund ID: ${fund._id}, Dept: ${fund.department}, Student: ${fund.studentId}`);
            if (fund.transactions && fund.transactions.length > 0) {
                for (const tx of fund.transactions) {
                    const performer = tx.performedBy ? await User.findById(tx.performedBy).lean() : null;
                    console.log(`  Transaction: ${tx.type} ${tx.amount}, PerformedBy: ${tx.performedBy} (${performer?.name || 'Unknown'})`);
                }
            } else {
                console.log("  No transactions found.");
            }
        }

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

checkDeptFunds();
