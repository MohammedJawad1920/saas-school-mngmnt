
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const OLD_ID = '2000';
const NEW_ID = '992';

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;

        // 1. Check existence
        const user = await db.collection('users').findOne({ _id: OLD_ID });
        if (!user) {
            console.error(`User ${OLD_ID} not found.`);
            process.exit(1);
        }

        const existingNewUser = await db.collection('users').findOne({ _id: NEW_ID });
        if (existingNewUser) {
            console.error(`User ${NEW_ID} already exists. Aborting.`);
            process.exit(1);
        }

        console.log(`Starting migration for ${user.name} (${OLD_ID} -> ${NEW_ID})...`);

        // 2. Create new User document
        // Handle unique email constraint: temporarily rename email on old user
        const originalEmail = user.email;
        await db.collection('users').updateOne({ _id: OLD_ID }, { $set: { email: `temp_migrated_${Date.now()}@example.com` } });
        
        const newUser = { ...user, _id: NEW_ID };
        await db.collection('users').insertOne(newUser);
        console.log('Created new user record.');

        // 3. Migrate Collections with studentId field
        const collectionsWithStudentId = [
            'studentcoupons',
            'studentsfunds',
            'studentattendances',
            'rentals',
            'remarks',
            'marks',
            'studentmasjidattendances',
            'studentliteraryattendances',
            'libraryrequests',
            'gatepasses',
            'leaverecords',
            'applicationforms'
        ];

        for (const collName of collectionsWithStudentId) {
            const result = await db.collection(collName).updateMany(
                { studentId: OLD_ID },
                { $set: { studentId: NEW_ID } }
            );
            console.log(`Updated ${collName}: ${result.modifiedCount} records.`);
        }

        // 4. Migrate Collections with nested studentData (Attendance)
        const collectionsWithNestedAttendance = [
            'attendances',
            'masjidattendances',
            'literaryattendances'
        ];

        for (const collName of collectionsWithNestedAttendance) {
            const result = await db.collection(collName).updateMany(
                { 'attendanceData.studentId': OLD_ID },
                { $set: { 'attendanceData.$[elem].studentId': NEW_ID } },
                { arrayFilters: [{ 'elem.studentId': OLD_ID }] }
            );
            console.log(`Updated nested attendance in ${collName}: ${result.modifiedCount} records.`);
        }

        // 5. Migrate Participant collection (Uses student ID as _id)
        const participant = await db.collection('participants').findOne({ _id: OLD_ID });
        if (participant) {
            const newParticipant = { ...participant, _id: NEW_ID };
            await db.collection('participants').insertOne(newParticipant);
            await db.collection('participants').deleteOne({ _id: OLD_ID });
            console.log('Migrated participant record.');
        }

        // 6. Migrate Batch collection (Array of student IDs)
        const batchUpdateResult = await db.collection('batches').updateMany(
            { students: OLD_ID },
            { $set: { 'students.$[elem]': NEW_ID } },
            { arrayFilters: [{ elem: OLD_ID }] }
        );
        console.log(`Updated batches: ${batchUpdateResult.modifiedCount} records.`);

        // 7. Migrate Classes (teacherId) and other potential teacher/admin refs
        // Even though ALI MUKHTHAR AHMAD is a student, for completeness we check these.
        const teacherRefs = [
            { coll: 'classes', field: 'teacherId' },
            { coll: 'attendances', field: 'teacherId' },
            { coll: 'studentattendances', field: 'attendanceRecords.teacherId' },
            { coll: 'masjidattendances', field: 'markedBy' },
            { coll: 'remarks', field: 'addedBy' },
            { coll: 'studentsfunds', field: 'updatedBy' },
            { coll: 'studentsfunds', field: 'transactions.performedBy' },
            { coll: 'teacherattendances', field: 'teacherId' },
            { coll: 'teachersleaverecords', field: 'teacherId' },
            { coll: 'timetables', field: 'periods.teacherId' }
        ];

        for (const ref of teacherRefs) {
            const result = await db.collection(ref.coll).updateMany(
                { [ref.field]: OLD_ID },
                { $set: { [ref.field]: NEW_ID } }
            );
            if (result.modifiedCount > 0) {
                console.log(`Updated teacher/meta ref in ${ref.coll}.${ref.field}: ${result.modifiedCount} records.`);
            }
        }

        // 8. Delete old User document
        await db.collection('users').deleteOne({ _id: OLD_ID });
        console.log('Deleted old user record.');

        console.log('Migration completed successfully!');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
