import { model, models, Schema } from "mongoose";
import User from "./User.js";
import Batch from "./Batch.js";
import Subject from "./Subject.js";

const classSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9-]+$/,
        "Class ID must only contain uppercase letters, numbers, and hyphens (-).",
      ],
    },
    name: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
      uppercase: true,
      minlength: [2, "Class name must be at least 2 characters"],
      maxlength: [50, "Class name cannot exceed 50 characters"],
    },
    shortname: {
      type: String,
      trim: true,
      uppercase: true,
    },
    batchId: {
      type: String,
      required: [true, "Batch is required"],
      ref: "Batch",
    },
    teacherId: {
      type: String,
      ref: "User",
    },
    coreSubjects: [
      {
        type: String,
        ref: "Subject",
      },
    ],
    majorSubjects: [
      {
        type: String,
        ref: "Subject",
      },
    ],
    status: {
      type: String,
      enum: ["Active", "Closed"],
      default: "Active",
      required: [true, "Status is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Force model reload in development to ensure schema changes like 'shortname' are picked up
if (process.env.NODE_ENV === "development") {
  delete models.Class;
}

const Class = models?.Class || model("Class", classSchema);
export default Class;
