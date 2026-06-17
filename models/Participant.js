import { model, models, Schema } from "mongoose";

import Team from "./Team";
import Division from "./Division";
import Program from "./Program";
import User from "./User";
import Batch from "./Batch";

const participantSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9-\s]+$/,
        "Participant ID must only contain letters, numbers, hyphens (-), and spaces.",
      ],
      ref: "User",
    },
    batchId: {
      type: String,
      required: true,
      ref: "Batch",
    },
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
    chestNumber: {
      type: Number,
    },

    teamId: {
      type: String,
      required: true,
      ref: "Team",
    },
    divisionId: {
      type: String,
      required: true,
      ref: "Division",
    },
    programs: [
      {
        id: {
          type: String,
          ref: "Program",
        },
        rank: {
          type: Number,
          default: 0,
          min: [0, "Rank must be a positive value"],
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
      },
    ],
    stagePoints: {
      type: Number,
      default: 0,
      min: [0, "Stage points must be a positive value"],
    },
    offStagePoints: {
      type: Number,
      default: 0,
      min: [0, "Off-stage points must be a positive value"],
    },
  },
  {
    timestamps: true,
  }
);

participantSchema.index({ "programs.id": 1 }, { unique: true, sparse: true });
participantSchema.index({ _id: 1, year: 1 }, { unique: true });

if (models.Participant) delete models.Participant;
const Participant = model("Participant", participantSchema);
export default Participant;
