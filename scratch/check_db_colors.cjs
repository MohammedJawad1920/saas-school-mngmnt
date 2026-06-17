const mongoose = require('mongoose');

// Define Schema
const teamSchema = new mongoose.Schema({
  _id: String,
  name: String,
  color: String,
});

const Team = mongoose.models.Team || mongoose.model('Team', teamSchema);

async function check() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set");
    return;
  }
  
  await mongoose.connect(uri);
  console.log("Connected to DB");
  
  const teams = await Team.find({}, '_id name color').lean();
  console.log("ALL TEAMS IN DB:");
  console.table(teams);
  
  await mongoose.disconnect();
}

check();
