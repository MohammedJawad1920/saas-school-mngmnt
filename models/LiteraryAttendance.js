import { Schema } from "mongoose";
import { models, model } from "mongoose";
import LiteraryGroup from "./LiteraryGroup";
import Class from "./Class";
const literaryAttendanceSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
      validate: {
        validator: (v) => v <= new Date(),
        message: "Attendance date cannot be in the future",
      },
    },
    day: {
      type: String,
      required: true,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },
    category: {
      type: String,
      required: true,
    },
    groupId: {
      type: String,
      required: function () {
        return this.category === "GROUP";
      },
      ref: "LiteraryGroup",
      trim: true,
    },
    classId: {
      type: String,
      required: false,
      ref: "Class",
      trim: true,
    },
    batchId: {
      type: String,
      required: false,
      ref: "Batch",
      trim: true,
    },

    attendanceData: [
      {
        studentId: {
          type: String,
          required: true,
          ref: "User",
        },
        present: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// Force model reload in development to ensure schema changes are picked up
if (process.env.NODE_ENV === "development") {
  delete models.LiteraryAttendance;
}

const LiteraryAttendance =
  models.LiteraryAttendance ||
  model("LiteraryAttendance", literaryAttendanceSchema);

export default LiteraryAttendance;
