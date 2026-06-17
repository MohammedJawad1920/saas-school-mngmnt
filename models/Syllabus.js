import mongoose from "mongoose";

const syllabusSchema = new mongoose.Schema({
  course: {
    type: String,
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
});

const Syllabus =
  mongoose.models.Syllabus || mongoose.model("Syllabus", syllabusSchema);

export default Syllabus;