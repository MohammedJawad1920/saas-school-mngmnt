
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Manual env loading since we can't rely on dotenv
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

const fixAttendance = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in .env.local');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for FIX');

        // Find all student attendances with corrupted batchId
        console.log('Finding corrupted records...');
        const corruptedIds = await mongoose.connection.collection('studentattendances').distinct('studentId', {
            "attendanceRecords.batchId": "[object Object]"
        });

        console.log(`Found ${corruptedIds.length} students with corrupted records.`);

        let processedCount = 0;
        let updatedCount = 0;
        const totalStudents = corruptedIds.length;

        for (const studentId of corruptedIds) {
            try {
                // Fetch student to get valid batchId
                let queryId = studentId;
                try {
                    queryId = new mongoose.Types.ObjectId(studentId);
                } catch (e) { }

                const student = await mongoose.connection.collection('users').findOne(
                    { _id: queryId },
                    { projection: { id: 1, name: 1, "studentSpecificField.batchId": 1, "studentSpecificField.classId": 1 } }
                );

                if (!student || !student.studentSpecificField || !student.studentSpecificField.batchId) {
                    console.warn(`Skipping student ${studentId}: No batchId found in User profile.`);
                    continue;
                }

                // Handle if batchId in User is also an object (nested issue) or string
                let correctBatchId = student.studentSpecificField.batchId;
                if (typeof correctBatchId === 'object') {
                    correctBatchId = correctBatchId._id ? String(correctBatchId._id) : (correctBatchId.id ? String(correctBatchId.id) : null);
                } else {
                    correctBatchId = String(correctBatchId);
                }

                if (!correctBatchId || correctBatchId === '[object Object]') {
                    console.warn(`Skipping student ${studentId}: Invalid batchId in User profile: ${student.studentSpecificField.batchId}`);
                    continue;
                }

                const currentClassId = student.studentSpecificField.classId;

                // Update records for this student
                // We only update records where classId matches user's current classId to be safe
                // or if we decide to just fix all "[object Object]" to this batchId. 
                // Given the issue is "current batchId" blindly applied, restoring current batchId is the logic.

                const result = await mongoose.connection.collection('studentattendances').updateMany(
                    {
                        studentId: studentId,
                        "attendanceRecords.batchId": "[object Object]"
                    },
                    {
                        // DB-level update with arrayFilters is safer but here we need to potentially granularly update
                        // because we can't easily set array elements based on condition in simple updateMany without pipeline
                        // However, using arrayFilters:
                        $set: { "attendanceRecords.$[elem].batchId": correctBatchId }
                    },
                    {
                        arrayFilters: [{ "elem.batchId": "[object Object]" }]
                    }
                );

                if (result.modifiedCount > 0) {
                    updatedCount += result.modifiedCount;
                }
            } catch (err) {
                console.error(`Error processing student ${studentId}:`, err);
            }

            processedCount++;
            if (processedCount % 10 === 0) {
                process.stdout.write(`\rProcessed ${processedCount}/${totalStudents} students...`);
            }
        }

        console.log('\nFix Complete.');
        console.log(`Updated ${updatedCount} individual attendance records.`);

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

fixAttendance();
