
import mongoose from 'mongoose';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

// Define Schema locally
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

const DOWNLOADS_DIR = 'C:\\Users\\ABDULLA\\Downloads';

// Patterns to match CSV files
const FILE_PATTERNS = [
    'KANNADA NEW CATALOGUE  - K-BG',
    'كتب - شروح الحديث',
    'LIBRARY CATALOGUE'
];

// Helper to find file matching pattern
function findFile(pattern) {
    try {
        const files = fs.readdirSync(DOWNLOADS_DIR);
        // Find file that includes the pattern and ends with .csv
        // (User's manual edit looked for .json, but only .csv exist)
        const match = files.find(file =>
            file.toLowerCase().includes(pattern.toLowerCase()) &&
            file.toLowerCase().endsWith('.csv')
        );
        return match ? path.join(DOWNLOADS_DIR, match) : null;
    } catch (err) {
        console.error(`Error reading downloads directory: ${err.message}`);
        return null;
    }
}

// Helper to extract prefix and number (User Logic)
function parseId(id) {
    if (!id) return { prefix: '', number: null };
    const strId = String(id).trim();

    // Regex to match prefix (anything that is not a digit at the end) and number (digits at the end)
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

async function importBooks() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        let totalImported = 0;

        for (const pattern of FILE_PATTERNS) {
            const filePath = findFile(pattern);
            if (!filePath) {
                console.warn(`No file found matching pattern: "${pattern}"`);
                continue;
            }

            console.log(`Processing file: ${filePath}`);

            // Read CSV as UTF-8 string to handle special chars (Arabic/Kannada)
            const fileContent = fs.readFileSync(filePath, 'utf8');
            // Parse CSV with XLSX
            const workbook = XLSX.read(fileContent, { type: 'string' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const books = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            console.log(`Found ${books.length} rows in ${path.basename(filePath)}`);

            const operations = [];

            for (const row of books) {
                // Normalize keys for case-insensitive lookup
                const normalizedRow = {};
                Object.keys(row).forEach(key => {
                    normalizedRow[key.trim().toLowerCase()] = row[key];
                });

                // Find ID from '_id' or 'id'
                const rawId = normalizedRow['_id'] || normalizedRow['id'];

                if (!rawId) {
                    continue;
                }

                const { prefix, number } = parseId(rawId);

                // Extract fields with fallback
                const name = normalizedRow['name'] || normalizedRow['title'] || normalizedRow['book name'] || 'Unknown Title';
                const author = normalizedRow['author'] || 'Unknown Author';
                const category = normalizedRow['category'] || 'General';
                const language = normalizedRow['language'];
                const publication = normalizedRow['publication'] || normalizedRow['publicat'];
                const priceStr = normalizedRow['price'];

                // Clean price
                let price = 0;
                if (priceStr) {
                    const cleaned = priceStr.toString().replace(/[,]/g, '').trim();
                    const parsed = parseFloat(cleaned);
                    price = isNaN(parsed) ? 0 : parsed;
                }

                const updateDoc = {
                    id: rawId.toString().trim(),
                    prefix: prefix,
                    number: number,
                    category: category.toString().trim(),
                    name: name.toString().trim(),
                    author: author.toString().trim(),
                    // Use optional chaining equivalent checks
                    language: language ? language.toString().trim() : undefined,
                    publication: publication ? publication.toString().trim() : undefined,
                    price: price,
                    status: normalizedRow['status'] || "Available"
                };

                // Remove undefined fields
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
                const count = result.upsertedCount + result.modifiedCount + (result.matchedCount || 0);
                // matchedCount includes modifiedCount, but logic varies. 
                // Safest to rely on `result.matchedCount` if we want total touched records.
                console.log(`Processed ${operations.length} records from ${path.basename(filePath)}`);
                totalImported += operations.length;
            } else {
                console.log(`No valid books to import from ${path.basename(filePath)}`);
            }
        }
        console.log(`Total books processed: ${totalImported}`);

    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

importBooks();
