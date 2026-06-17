const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const users = db.collection('users');
    
    const statuses = await users.aggregate([
        { $match: { roles: 'Student' } },
        { $group: { _id: '$studentSpecificField.status', count: { $sum: 1 } } }
    ]).toArray();
    console.log('Student Status Distribution:', JSON.stringify(statuses, null, 2));
    
    const sample = await users.findOne({ _id: '608' });
    console.log('Student 608 details:', JSON.stringify({
        id: sample?._id,
        classId: sample?.studentSpecificField?.classId,
        batchId: sample?.studentSpecificField?.batchId,
        status: sample?.studentSpecificField?.status
    }, null, 2));
    
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
