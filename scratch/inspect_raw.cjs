const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const mongoUri = process.env.MONGODB_URI;
console.log("URI:", mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected successfully");
    const db = mongoose.connection.db;
    
    // 1. Get sample batch and class
    const batches = await db.collection("batches").find({}).limit(5).toArray();
    console.log("Batches:", batches.map(b => ({ id: b._id, name: b.name })));
    
    const classes = await db.collection("classes").find({}).limit(5).toArray();
    console.log("Classes:", classes.map(c => ({ id: c._id, name: c.name, batchId: c.batchId })));
    
    // 2. Look at a few attendance documents in the raw "attendances" collection
    const attendances = await db.collection("attendances").find({}).limit(3).toArray();
    console.log("Raw Attendances Sample:", JSON.stringify(attendances, null, 2));

    // 3. Count documents
    const totalAttendances = await db.collection("attendances").countDocuments();
    console.log("Total Attendances count:", totalAttendances);
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
