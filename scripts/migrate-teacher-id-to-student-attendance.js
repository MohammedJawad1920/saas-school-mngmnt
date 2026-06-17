
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

const migrateTeacherId = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI not found in .env.local');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const studentAttendancesCol = mongoose.connection.collection('studentattendances');
        const attendancesCol = mongoose.connection.collection('attendances');

        const studentDocs = await studentAttendancesCol.find({
            "attendanceRecords.teacherId": { $exists: false }
        }).toArray();

        console.log(`Found ${studentDocs.length} students with records to migrate.`);

        let totalUpdated = 0;

        for (const doc of studentDocs) {
            let docModified = false;
            
            // For each record in this student's history
            for (let i = 0; i < doc.attendanceRecords.length; i++) {
                const record = doc.attendanceRecords[i];
                
                if (!record.teacherId) {
                    // Try to find the master attendance record
                    const master = await attendancesCol.findOne({
                        classId: record.classId,
                        subjectId: record.subjectId,
                        date: record.date,
                        periodNumber: record.periodNumber
                    });

                    if (master && master.teacherId) {
                        record.teacherId = master.teacherId;
                        docModified = true;
                    }
                }
            }

            if (docModified) {
                await studentAttendancesCol.updateOne(
                    { _id: doc._id },
                    { $set: { attendanceRecords: doc.attendanceRecords } }
                );
                totalUpdated++;
            }
        }

        console.log(`Migration complete. Updated ${totalUpdated} students.`);

    } catch (error) {
        console.error('Migration Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

migrateTeacherId();
