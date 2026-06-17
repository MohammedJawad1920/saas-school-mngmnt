import { Schema, model, models } from "mongoose";
import Class from "./Class";
import Batch from "./Batch";
import User from "./User";

const studentAttendanceSchema = new Schema(
  {
    studentId: {
      type: String,
      required: true,
      ref: "User",
      index: true,
    },
    attendanceRecords: [
      {
        classId: {
          type: String,
          required: true,
          ref: "Class",
        },
        batchId: {
          type: String,
          required: true,
          ref: "Batch",
        },
        day: {
          type: String,
          required: true,
        },
        prayer: {
          type: String,
          required: true,
        },
        date: {
          type: Date,
          required: true,
        },
        present: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const StudentMasjidAttendance =
  models.StudentMasjidAttendance ||
  model("StudentMasjidAttendance", studentAttendanceSchema);

export default StudentMasjidAttendance;