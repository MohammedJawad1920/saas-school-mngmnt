import { Schema, model, models } from "mongoose";
import Class from "./Class";
import User from "./User";

const remarkSchema = new Schema(
  {
    classId: {
      type: String,
      ref: "Class",
      required: true,
      index: true,
    },
    studentId: {
      type: String,
      ref: "User",
      required: true,
    },
    teacherId: {
      type: String,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    comments: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "pending"
    }
  },
  { timestamps: true }
);

if (process.env.NODE_ENV === "development") {
  delete models.Remark;
}

const Remark = models?.Remark || model("Remark", remarkSchema);

export default Remark;
