
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function testApi() {
  const apiKey = process.env.API_KEY;
  const baseUrl = `http://localhost:3000`;
  const url = `${baseUrl}/api/classes?projection=_id,name,batchId,coreSubjects,majorSubjects`;

  try {
    const response = await axios.get(url, {
      headers: { 'api-key': apiKey }
    });
    const data = response.data;
    console.log(`Fetched ${data.classes.length} classes`);
    data.classes.forEach(c => {
      console.log(`ID: ${c._id}, Name: ${c.name}, BatchName: ${c.batchName}`);
    });
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testApi();
