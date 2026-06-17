
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function checkIds() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const users = db.collection('users');

        const user2000 = await users.findOne({ _id: '2000' });
        const user992 = await users.findOne({ _id: '992' });

        console.log('User 2000:', user2000 ? 'Found' : 'Not Found');
        if (user2000) console.log('User 2000 Name:', user2000.name);
        
        console.log('User 992:', user992 ? 'Found (Wait, this might be a problem!)' : 'Not Found');

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkIds();
