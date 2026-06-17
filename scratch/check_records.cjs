const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

async function check() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const TimeTable = mongoose.model("TimeTable", new mongoose.Schema({}, { strict: false }));
  const Attendance = mongoose.model("Attendance", new mongoose.Schema({}, { strict: false }));
  const Class = mongoose.model("Class", new mongoose.Schema({}, { strict: false }));

  const classes = await Class.find({}).limit(5);
  console.log(`Found ${classes.length} classes`);

  const timetables = await TimeTable.find({}).limit(5);
  console.log(`Found ${timetables.length} timetables`);
  if (timetables.length > 0) {
    console.log("Example timetable slots sample:", JSON.stringify(timetables[0].timeSlots?.slice(0, 2), null, 2));
  }

  const attendances = await Attendance.find({}).sort({ date: -1 }).limit(5);
  console.log(`Found ${attendances.length} recent attendances`);
  if (attendances.length > 0) {
    console.log("Example attendance:", JSON.stringify(attendances[0], null, 2));
  }

  await mongoose.disconnect();
}

check().catch(console.error);
