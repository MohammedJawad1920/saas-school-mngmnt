import { model, models, Schema } from "mongoose";
import Program from "./Program";
import Participant from "./Participant";

const resultSchema = new Schema(
  {
    programId: {
      type: String,
      ref: "Program",
      required: true,
    },
    year: {
      type: String,
      required: true,
      index: true,
      default: "2025 november",
    },
    participants: [
      {
        id: {
          type: String,
          ref: "Participant",
          required: true,
        },
        codeLetter: {
          type: String,
          trim: true,
        },
        grade: {
          type: String,
          trim: true,
        },
        points: {
          type: Number,
          default: 0,
          min: [0, "Points must be a positive value"],
        },
        rank: {
          type: Number,
          default: 0,
          min: [0, "Rank must be a positive value"],
        },
      },
    ],
    isResultDeclared: {
      type: Boolean,
      default: false,
    },
    resultNumber: {
      type: Number,
      default: null,
      sparse: true,
    },
    declaredAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

resultSchema.index({ programId: 1, year: 1 }, { unique: true });

const Result = models.Result || model("Result", resultSchema);

export default Result;
