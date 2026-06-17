import { model, models, Schema } from "mongoose";
import Division from "./Division";
import Participant from "./Participant";

const programSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    year: {
      type: String,
      required: true,
      index: true,
      default: "2025 november",
    },
    rules: {
      type: String,
      trim: true,
    },
    topics: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["Group", "Individual"],
    },
    divisionId: {
      type: String,
      ref: "Division",
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Stage", "Off-Stage"],
    },
    maxParticipants: {
      type: Number,
      required: true,
      min: [1, "Max Participants must be a positive value"],
    },
    pointScheme: {
      type: String,
      required: true,
      enum: ["3, 2, 1", "5, 3, 1", "10, 7, 5", "15, 10, 5", "20, 15, 10"],
    },
  },
  { timestamps: true }
);

programSchema.index({ name: 1, divisionId: 1, year: 1 }, { unique: true });

const Program = models?.Program || model("Program", programSchema);

export default Program;
