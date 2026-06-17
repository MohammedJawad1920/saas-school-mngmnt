import { model, models, Schema } from "mongoose";
import Class from "./Class";
import Subject from "./Subject";
import User from "./User";
import Batch from "./Batch";

const attendanceSchema = new Schema(
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
    teacherId: {
      type: String,
      required: true,
      ref: "User",
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
    attendanceData: [
      {
        studentId: {
          type: String,
          required: true,
          ref: "User",
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

// Create a compound index for attendance records
attendanceSchema.index(
  { classId: 1, subjectId: 1, date: 1, periodNumber: 1 },
  { unique: true }
);

// Pre-save validation to ensure teacherId has Teacher role
attendanceSchema.pre("save", async function (next) {
  try {
    const teacher = await models.User.findById(this.teacherId);
    if (!teacher || !teacher.roles.includes("Teacher")) {
      return next(new Error("Only teachers can record attendance"));
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save validation to ensure all studentIds exist in the class
attendanceSchema.pre("save", async function (next) {
  try {
    if (!this.attendanceData || this.attendanceData.length === 0) {
      return next();
    }

    // Get all students in this class OR assigned to CORE/MAJOR subjects in this class
    const classStudents = await User.find({
      $or: [
        { "studentSpecificField.classId": this.classId },
        { "studentSpecificField.subjectTypeAssignments": { 
            $in: [`${this.classId}:CORE`, `${this.classId}:MAJOR`] 
          } 
        }
      ],
      roles: { $in: ["Student"] },
    }).select("_id");

    const classStudentIds = classStudents.map((student) =>
      student?._id.toString()
    );

    // Check if all attendanceData students belong to the class
    for (const record of this.attendanceData) {
      if (!classStudentIds.includes(record.studentId.toString())) {
        return next(
          new Error(`Student ${record.studentId} is not in this class`)
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Force model reload in development
if (process.env.NODE_ENV === "development") {
  delete models.Attendance;
}

const Attendance = models.Attendance || model("Attendance", attendanceSchema);
export default Attendance;
