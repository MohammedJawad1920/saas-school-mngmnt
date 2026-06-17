const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'raw_books.txt');
const outputPath = path.join(__dirname, 'books.json');

const rawData = fs.readFileSync(inputPath, 'utf8');
const lines = rawData.split('\n').filter(line => line.trim() !== '');

const books = lines.map(line => {
    // Handling both tabs and multiple spaces as delimiters
    // The data seems to have tabs or multiple spaces.
    // Let's try splitting by tab first.
    let parts = line.split('\t').map(p => p.trim());
    
    // If not tabs, maybe multiple spaces?
    if (parts.length < 8) {
        parts = line.split(/\s{2,}/).map(p => p.trim());
    }

    if (parts.length >= 8) {
        const [name, id, author, price, status, language, category, publication] = parts;
        
        // Extract prefix and number
        const match = id.match(/^([a-zA-Z]+)(\d+)$/);
        const prefix = match ? match[1] : '';
        const number = match ? match[2] : id;

        return {
            id,
            prefix,
            number,
            name,
            author,
            price: parseFloat(price) || 0,
            status: status || 'Available',
            language,
            category,
            publication
        };
    }
    return null;
}).filter(book => book !== null);

fs.writeFileSync(outputPath, JSON.stringify(books, null, 2));
console.log(`Parsed ${books.length} books.`);
