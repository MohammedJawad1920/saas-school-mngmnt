import { Schema, model, models } from "mongoose";
import Class from "./Class";
import User from "./User";

const leaveRecordSchema = new Schema(
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
    dateOfLeave: {
      type: Date,
      required: true,
    },
    leaveReason: {
      type: String,
      required: true,
    },
    dateOfArrival: {
      type: Date,
      validate: {
        validator: function (value) {
          return value >= this.dateOfLeave;
        },
        message: "Arrival date cannot be earlier than the leave date.",
      },
      required: true,
    },
    arrivedDate: {
      type: Date,
      validate: {
        validator: function (value) {
          return !value || !this.dateOfLeave || value >= this.dateOfLeave;
        },
        message: "Arrived date cannot be earlier than the leave date.",
      },
    },
    lateReason: {
      type: String,
    },
    remark: {
      type: String,
    },
  },
  { timestamps: true }
);

const LeaveRecord =
  models?.LeaveRecord || model("LeaveRecord", leaveRecordSchema);

export default LeaveRecord;
