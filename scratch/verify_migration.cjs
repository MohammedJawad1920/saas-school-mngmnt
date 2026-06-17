
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function verify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const db = mongoose.connection.db;

        const user992 = await db.collection('users').findOne({ _id: '992' });
        const user2000 = await db.collection('users').findOne({ _id: '2000' });

        console.log('User 992:', user992 ? `Found (${user992.name})` : 'Not Found');
        console.log('User 2000:', user2000 ? 'STILL FOUND (Oops!)' : 'Successfully Deleted');

        const couponsCount = await db.collection('studentcoupons').countDocuments({ studentId: '992' });
        console.log('Coupons for 992:', couponsCount);

        const attendanceCount = await db.collection('attendances').countDocuments({ 'attendanceData.studentId': '992' });
        console.log('Attendance Records for 992:', attendanceCount);

        const participant = await db.collection('participants').findOne({ _id: '992' });
        console.log('Participant 992:', participant ? 'Found' : 'Not Found');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verify();
