import { Schema, model, models } from "mongoose";
import LiteraryGroup from "./LiteraryGroup";
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
        category: {
          type: String,
          required: true,
          enum: ["GROUP", "ALL"],
        },
        classId: {
          type: String,
          required: function () {
            return this.category === "ALL";
          },
          ref: "Class",
        },
        batchId: {
          type: String,
          required: function () {
            return this.category === "ALL";
          },
          ref: "Batch",
        },
        groupId: {
          type: String,
          required: function () {
            return this.category === "GROUP";
          },
          ref: "LiteraryGroup",
        },
        day: {
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

const StudentLiteraryAttendance =
  models.StudentLiteraryAttendance ||
  model("StudentLiteraryAttendance", studentAttendanceSchema);

export default StudentLiteraryAttendance;
