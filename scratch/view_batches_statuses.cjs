require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB");
  
  const db = mongoose.connection.db;
  const batchesCollection = db.collection("batches");
  
  const batches = await batchesCollection.find({}).toArray();
  console.log("Current Batches in database:");
  const counts = {};
  batches.forEach(b => {
    counts[b.status] = (counts[b.status] || 0) + 1;
    console.log(`- ID: ${b._id}, Name: ${b.name}, Status: ${b.status}`);
  });
  console.log("Summary:", counts);
  
  mongoose.disconnect();
}

run().catch(console.error);
