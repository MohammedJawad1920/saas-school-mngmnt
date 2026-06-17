
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const StudentAttendanceSchema = new mongoose.Schema({
  attendanceRecords: [{
    classId: String,
    subjectId: String
  }]
}, { collection: 'studentattendances' });

async function checkAttendanceRecords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const StudentAttendance = mongoose.models.StudentAttendance || mongoose.model('StudentAttendance', StudentAttendanceSchema);

    const attendances = await StudentAttendance.find().lean();
    const classCount = {};
    
    attendances.forEach(doc => {
      doc.attendanceRecords.forEach(r => {
        const cId = r.classId;
        classCount[cId] = (classCount[cId] || 0) + 1;
      });
    });

    console.log('Records per class ID:');
    console.log(JSON.stringify(classCount, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAttendanceRecords();
