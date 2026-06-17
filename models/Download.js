import mongoose from "mongoose";

const downloadSchema = new mongoose.Schema({
  course: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  semester: {
    type: Number,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
}, { timestamps: true });

const Download = mongoose.models.Download || mongoose.model("Download", downloadSchema);

export default Download;
