import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from the root of the project
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

const libraryBookSchema = new mongoose.Schema({
    id: String,
    prefix: String,
    number: String,
    name: String,
    author: String,
    category: String,
    language: String,
    status: { type: String, default: "Available" },
    publication: String,
    price: Number
}, { timestamps: true });

const LibraryBook = mongoose.models.LibraryBook || mongoose.model("LibraryBook", libraryBookSchema);

function parseId(id) {
    if (!id) return { prefix: '', number: null };
    const strId = String(id).trim();

    const match = strId.match(/^(.+?)(\d+)$/);

    if (match) {
        return {
            prefix: match[1].trim(),
            number: parseInt(match[2], 10)
        };
    }

    if (/^\d+$/.test(strId)) {
        return { prefix: '', number: parseInt(strId, 10) };
    }

    return { prefix: strId, number: null };
}

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const filePath = path.join(__dirname, 'user_books.tsv');
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        const headers = lines[0].split('\t').map(h => h.trim());
        const books = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split('\t');
            const row = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx]?.trim();
            });
            books.push(row);
        }

        console.log(`Found ${books.length} books to process.`);

        const operations = [];

        for (const row of books) {
            const rawId = row['book ID'];
            if (!rawId) continue;

            const { prefix, number } = parseId(rawId);

            let price = 0;
            if (row['price']) {
                const cleaned = row['price'].toString().replace(/[,]/g, '').trim();
                const parsed = parseFloat(cleaned);
                price = isNaN(parsed) ? 0 : parsed;
            }

            const updateDoc = {
                id: rawId.trim(),
                prefix: prefix,
                number: number ? number.toString() : null,
                category: row['category'] || 'General',
                name: row['name'] || 'Unknown Title',
                author: row['author'] || 'Unknown Author',
                language: row['language'] || undefined,
                publication: row['PUBLICATION'] || undefined,
                price: price,
                status: row['status'] || "Available"
            };

            // Remove any undefined keys so they don't overwrite with nulls unnecessarily
            Object.keys(updateDoc).forEach(key => updateDoc[key] === undefined && delete updateDoc[key]);

            operations.push({
                updateOne: {
                    filter: { id: updateDoc.id },
                    update: { $set: updateDoc },
                    upsert: true
                }
            });
        }

        if (operations.length > 0) {
            const result = await LibraryBook.bulkWrite(operations);
            console.log(`Successfully processed ${operations.length} records.`);
            console.log(`Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}, Matched: ${result.matchedCount}`);
        } else {
            console.log("No valid books found to insert.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

run();
