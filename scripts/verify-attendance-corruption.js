
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const loadEnv = () => {
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf8');
            envConfig.split('\n').forEach(line => {
                const [key, ...rest] = line.split('=');
                if (key && rest.length > 0) {
                    process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
                }
            });
        }
    } catch (e) {
        console.error('Error loading .env.local', e);
    }
};

loadEnv();

const verifyCorruption = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in .env.local');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Query 1: Count affected records
        const countResult = await mongoose.connection.collection('studentattendances').aggregate([
            { $unwind: "$attendanceRecords" },
            { $match: { "attendanceRecords.batchId": "[object Object]" } },
            { $count: "corruptedRecords" }
        ]).toArray();

        console.log('Query 1: Affected Records Count:', countResult[0]?.corruptedRecords || 0);

        // Query 2: Identify affected students and dates
        const sampleRecords = await mongoose.connection.collection('studentattendances').aggregate([
            { $unwind: "$attendanceRecords" },
            { $match: { "attendanceRecords.batchId": "[object Object]" } },
            {
                $project: {
                    studentId: 1,
                    classId: "$attendanceRecords.classId",
                    date: "$attendanceRecords.date",
                    periodNumber: "$attendanceRecords.periodNumber"
                }
            },
            { $limit: 10 }
        ]).toArray();

        console.log('Query 2: Sample Affected Records:', JSON.stringify(sampleRecords, null, 2));

        // Query 3: Find correct batchId for affected students
        if (sampleRecords.length > 0) {
            const sampleStudentId = sampleRecords[0].studentId;
            // Handle both string ID and ObjectId for _id lookup depending on how it's stored
            let queryId = sampleStudentId;
            try {
                queryId = new mongoose.Types.ObjectId(sampleStudentId);
            } catch (e) {
                // Keep as string if not valid ObjectId
            }

            const student = await mongoose.connection.collection('users').findOne(
                { _id: queryId },
                { projection: { id: 1, name: 1, "studentSpecificField.batchId": 1, "studentSpecificField.classId": 1 } }
            );
            console.log('Query 3: Sample Student Data:', JSON.stringify(student, null, 2));

            // Also check Class collection if student batchId is also an object or missing
            if (student && student.studentSpecificField && student.studentSpecificField.classId) {
                const classId = student.studentSpecificField.classId;
                console.log(`Checking Class collection for classId: ${classId}`);
                // Assuming reference isn't populated here or we need to check how it's stored
                // If it's stored as ID string in user, we might need to look it up in Class collection if structure is different
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

verifyCorruption();
