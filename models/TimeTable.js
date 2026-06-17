import { model, models, Schema } from "mongoose";
import Class from "./Class";
import Subject from "./Subject";
import User from "./User";

const timeTableSchema = new Schema(
  {
    classId: {
      type: String,
      required: true,
      ref: "Class",
    },

    timeSlots: [
      {
        subjectId: {
          type: String,
          ref: "Subject",
        },
        teacherId: {
          type: String,
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
        validFrom: {
          type: Date,
        },
        validTo: {
          type: Date,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const TimeTable = models.TimeTable || model("TimeTable", timeTableSchema);

// Add indexes for optimizing queries by classId, teacherId and day
timeTableSchema.index({ classId: 1 });
timeTableSchema.index({ "timeSlots.teacherId": 1, "timeSlots.day": 1 });

export default TimeTable;
