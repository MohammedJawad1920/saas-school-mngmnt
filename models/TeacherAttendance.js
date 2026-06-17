import { model, models, Schema } from "mongoose";
import User from "./User";
import Class from "./Class";
import Subject from "./Subject";
import Batch from "./Batch";

const teacherAttendanceSchema = new Schema(
  {
    teacherId: {
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
        subjectId: {
          type: String,
          required: true,
          ref: "Subject",
        },
        periodNumber: {
          type: Number,
          required: true,
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
        autoMarked: {
          type: Boolean,
          default: false,
        },
        markedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-save validation to ensure teacherId has Teacher role
teacherAttendanceSchema.pre("save", async function (next) {
  try {
    const teacher = await models.User.findById(this.teacherId);
    if (!teacher || !teacher.roles.includes("Teacher")) {
      return next(new Error("Only teachers can have attendance records"));
    }
    next();
  } catch (error) {
    next(error);
  }
});

const TeacherAttendance =
  models.TeacherAttendance ||
  model("TeacherAttendance", teacherAttendanceSchema);
export default TeacherAttendance;
