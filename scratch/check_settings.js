import connectToDB from '../lib/db.js';
import Settings from '../models/Settings.js';

async function run() {
  await connectToDB();
  const s = await Settings.findOne({}).lean();
  console.log(JSON.stringify(s.institution.contact, null, 2));
  process.exit(0);
}
run();
