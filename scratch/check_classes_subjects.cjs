
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const ClassSchema = new mongoose.Schema({
  _id: String,
  name: String,
  coreSubjects: [String],
  majorSubjects: [String]
}, { collection: 'classes' });

async function checkClassesSubjects() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const Class = mongoose.models.Class || mongoose.model('Class', ClassSchema);

    const classes = await Class.find().lean();
    console.log(`Total classes found: ${classes.length}`);
    
    classes.forEach(c => {
      console.log(`ID: ${c._id}, Name: ${c.name}, Core: ${c.coreSubjects?.length || 0}, Major: ${c.majorSubjects?.length || 0}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkClassesSubjects();
