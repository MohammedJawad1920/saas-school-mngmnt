
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function verifyFix() {
  const apiKey = process.env.API_KEY;
  const baseUrl = `http://localhost:3000`;
  // Test with CLS-2 which has 0 subjects but 39k records
  const url = `${baseUrl}/api/studentAttendances?classId=CLS-2&limit=5`;

  try {
    const response = await axios.get(url, {
      headers: { 'api-key': apiKey }
    });
    const data = response.data;
    console.log(`Fetched ${data.studentAttendances.length} students for CLS-2`);
    if (data.studentAttendances.length > 0) {
      const firstStudent = data.studentAttendances[0];
      console.log(`Student: ${firstStudent.name}, Records: ${firstStudent.attendanceRecords.length}`);
      if (firstStudent.attendanceRecords.length > 0) {
        console.log(`First record date: ${firstStudent.attendanceRecords[0].date}, Class: ${firstStudent.attendanceRecords[0].className}`);
      }
    } else {
      console.log('No students found for CLS-2 (FIX FAILED or no students assigned to this class currently)');
    }
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

verifyFix();
