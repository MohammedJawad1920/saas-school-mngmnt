
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const analyzeFile = (filePath, headerRow = 0) => {
    console.log(`\n--- Analyzing ${path.basename(filePath)} ---`);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`First 200 chars:\n${JSON.stringify(content.slice(0, 200))}`);

    // Parse with XLSX
    const workbook = XLSX.read(content, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { range: headerRow, defval: "" });

    if (json.length === 0) {
        console.log("No records found.");
        return;
    }

    // Inspect Headers (keys of first row)
    const headers = Object.keys(json[0]);
    console.log("Headers found:", headers.map(h => `'${h}'`));

    // Check for ID column
    const idKeys = headers.filter(h => h.toLowerCase().includes('id') && !h.toLowerCase().includes('name') && !h.toLowerCase().includes('void'));
    console.log("Potential ID columns:", idKeys);

    // Check for duplicates
    const ids = [];
    let missingIdCount = 0;
    json.forEach((row, i) => {
        // Try to find ID using my previous logic
        let foundId = undefined;
        for (const k of headers) {
            if (k.trim().toLowerCase() === '_id' || k.trim().toLowerCase() === 'id') {
                foundId = row[k];
                break;
            }
        }

        if (foundId) {
            ids.push(foundId);
            if (i < 3) console.log(`Row ${i} ID: '${foundId}'`);
        } else {
            missingIdCount++;
            if (missingIdCount <= 3) console.log(`Row ${i} missing ID. Row:`, JSON.stringify(row));
        }
    });

    const uniqueIds = new Set(ids);
    console.log(`Total Records: ${json.length}`);
    console.log(`Total IDs found: ${ids.length}`);
    console.log(`Unique IDs: ${uniqueIds.size}`);
    console.log(`Duplicate IDs: ${ids.length - uniqueIds.size}`);

    // List some duplicates if any
    if (ids.length !== uniqueIds.size) {
        const counts = {};
        ids.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
        const duplicates = Object.keys(counts).filter(x => counts[x] > 1);
        console.log("First 5 duplicates:", duplicates.slice(0, 5).map(d => `${d} (x${counts[d]})`));
    }
};

const main = () => {
    analyzeFile(path.join(process.cwd(), 'KANNADA_NEW_CATALOGUE.csv'), 1);
    analyzeFile(path.join(process.cwd(), 'ARABIC_CATALOGUE.csv'), 0);
    analyzeFile(path.join(process.cwd(), 'LIBRARY_CATALOGUE_TOTAL.csv'), 0);
};

main();
