import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function fix() {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    // Find all library books
    const books = await db.collection('librarybooks').find({ id: { $regex: '^ENG' } }).toArray();
    let count = 0;

    for (const b of books) {
        if (b.id !== b.number) {
            await db.collection('librarybooks').updateOne({ _id: b._id }, { $set: { number: b.id } });
            count++;
        }
    }

    console.log("Updated " + count + " books.");
    process.exit(0);
}

fix().catch(console.error);
