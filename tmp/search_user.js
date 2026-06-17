import connectToDB from '../lib/db.js';
import User from '../models/User.js';

async function search() {
    try {
        await connectToDB();
        const users = await User.find({ name: /Husain/i });
        console.log(JSON.stringify(users, null, 2));
    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}

search();
