import connectToDB from "../lib/db.js";
import Batch from "../models/Batch.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

connectToDB()
  .then(async () => {
    const batches = await Batch.find({}).lean();
    console.log("Current Batches statuses count:");
    const statusCounts = {};
    batches.forEach(b => {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      console.log(`- Batch ID: ${b._id}, Name: ${b.name}, Status: ${b.status}`);
    });
    console.log("Summary:", statusCounts);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
