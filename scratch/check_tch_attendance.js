
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
        // console.error('Error loading .env.local', e);
    }
};

loadEnv();

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const col = mongoose.connection.collection('studentattendances');
        const count = await col.countDocuments({ studentId: "TCH-004" });
        console.log(`Found ${count} student attendance documents for TCH-004`);
        if (count > 0) {
            const sample = await col.findOne({ studentId: "TCH-004" });
            console.log("Sample:", JSON.stringify(sample, null, 2));
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkData();
