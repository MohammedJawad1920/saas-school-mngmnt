import { model, models, Schema } from "mongoose";
import Participant from "./Participant";
import User from "./User";

const teamSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9-]+$/,
        "Team ID must only contain uppercase letters, numbers, and hyphens (-).",
      ],
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
    leaderId: {
      type: String,
      required: true,
      unique: true,
      ref: "User",
    },
    membersId: {
      type: [String],
      required: true,
      ref: "Participant",
    },
    stagePoints: {
      type: Number,
      default: 0,
    },
    offStagePoints: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: "#808080", // Default neutral color
    },
  },
  {
    timestamps: true,
  }
);

// Clear the model from cache in development to ensure schema changes are picked up
if (process.env.NODE_ENV === "development") {
  delete models.Team;
}

teamSchema.index({ name: 1, year: 1 }, { unique: true });
teamSchema.index({ _id: 1, year: 1 }, { unique: true });

const Team = models.Team || model("Team", teamSchema);

export default Team;
