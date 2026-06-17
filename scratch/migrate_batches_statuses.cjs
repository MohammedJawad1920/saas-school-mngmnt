require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB");
  
  const db = mongoose.connection.db;
  const batchesCollection = db.collection("batches");
  
  // Migrate Active to Acivated
  const resActive = await batchesCollection.updateMany(
    { status: "Active" },
    { $set: { status: "Acivated" } }
  );
  console.log(`Migrated ${resActive.modifiedCount} Active batches to Acivated`);
  
  // Migrate Stopped Out to Accelerated
  const resStopped = await batchesCollection.updateMany(
    { status: "Stopped Out" },
    { $set: { status: "Accelerated" } }
  );
  console.log(`Migrated ${resStopped.modifiedCount} Stopped Out batches to Accelerated`);
  
  // Verify current counts
  const batches = await batchesCollection.find({}).toArray();
  const counts = {};
  batches.forEach(b => {
    counts[b.status] = (counts[b.status] || 0) + 1;
  });
  console.log("New Summary:", counts);
  
  mongoose.disconnect();
}

run().catch(console.error);
