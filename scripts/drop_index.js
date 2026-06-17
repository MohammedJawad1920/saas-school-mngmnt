import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env');
    process.exit(1);
}

async function dropIndex() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('finances');

        // Check if index exists
        const indexes = await collection.indexes();
        const indexName = 'invoiceNo_1_type_1';
        const indexExists = indexes.some(idx => idx.name === indexName);

        if (indexExists) {
            console.log(`Found index '${indexName}'. Dropping it...`);
            await collection.dropIndex(indexName);
            console.log(`Index '${indexName}' dropped successfully.`);
        } else {
            console.log(`Index '${indexName}' not found. It might have already been dropped.`);
        }

    } catch (error) {
        console.error('Error dropping index:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

dropIndex();
