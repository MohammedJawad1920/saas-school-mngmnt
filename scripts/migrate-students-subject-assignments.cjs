const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env.local');
  process.exit(1);
}

// Define the User schema (simplified for migration)
const userSchema = new mongoose.Schema({
  roles: [String],
  studentSpecificField: {
    classId: { type: mongoose.Schema.Types.ObjectId },
    status: String,
    subjectTypeAssignments: [String]
  }
}, { strict: false });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function migrate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully.');

    // Find all active students
    const students = await User.find({
      roles: 'Student',
      'studentSpecificField.status': 'Active'
    });

    console.log(`Found ${students.length} active students to migrate.`);

    let updatedCount = 0;
    for (const student of students) {
      const classId = student.studentSpecificField?.classId;
      
      if (classId) {
        const classIdStr = classId.toString();
        const assignments = [`${classIdStr}:CORE`, `${classIdStr}:MAJOR`];
        
        // Update the student
        await User.updateOne(
          { _id: student._id },
          { $set: { 'studentSpecificField.subjectTypeAssignments': assignments } }
        );
        updatedCount++;
        
        if (updatedCount % 10 === 0) {
          console.log(`Updated ${updatedCount} students...`);
        }
      }
    }

    console.log(`Migration completed. ${updatedCount} students updated.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

migrate();
