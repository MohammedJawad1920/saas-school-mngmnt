import { model, models, Schema } from "mongoose";

const teachersLeaveRecordSchema = new Schema({
  teacherId: {
    type: String,
    required: true,
    ref: "User",
    index: true,
  },
  classId: {
    type: String,
    required: true,
    ref: "Class",
    index: true,
  },
  periodNumber: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  leaveReason: {
    type: String,
    required: false,
  },
});

teachersLeaveRecordSchema.index(
  { teacherId: 1, classId: 1, periodNumber: 1, date: 1 },
  { unique: true }
);

const TeachersLeaveRecord =
  models.TeachersLeaveRecord ||
  model("TeachersLeaveRecord", teachersLeaveRecordSchema);
export default TeachersLeaveRecord;
