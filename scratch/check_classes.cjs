
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const ClassSchema = new mongoose.Schema({
  _id: String,
  name: String,
  batchId: { type: String, ref: 'Batch' }
}, { collection: 'classes' });

const BatchSchema = new mongoose.Schema({
  _id: String,
  name: String
}, { collection: 'batches' });

async function checkClasses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const Batch = mongoose.models.Batch || mongoose.model('Batch', BatchSchema);
    const Class = mongoose.models.Class || mongoose.model('Class', ClassSchema);

    const classes = await Class.find().populate('batchId');
    console.log(`Total classes found: ${classes.length}`);
    
    classes.forEach(c => {
      console.log(`ID: ${c._id}, Name: ${c.name}, Batch: ${c.batchId ? c.batchId.name : 'N/A'}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkClasses();
