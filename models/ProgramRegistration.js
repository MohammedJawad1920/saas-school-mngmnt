import { Schema } from "mongoose";
import { model, models } from "mongoose";
import Program from "./Program";
import Participant from "./Participant";
import Team from "./Team";

const programRegistrationSchema = new Schema(
  {
    programId: {
      type: Schema.Types.ObjectId,
      ref: "Program",
      required: true,
    },
    teamId: {
      type: String,
      ref: "Team",
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
          required: true,
          trim: true,
          ref: "Participant",
        },
        codeLetter: {
          type: String,
          trim: true,
        },
        marksByJudges: {
          type: [Number],
          default: [],
        },
        totalMarks: {
          type: Number,
          default: 0,
          min: [0, "Total marks must be a positive value"],
        },
      },
    ],
    isResultDeclared: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

programRegistrationSchema.index({ programId: 1, teamId: 1, year: 1 }, { unique: true }); // Prevent duplicate registrations
programRegistrationSchema.index({ "participants.id": 1 }); // For participant queries
programRegistrationSchema.index({ "participants.totalMarks": 1 }); // For status filtering
programRegistrationSchema.index({ "participants.codeLetter": 1 }); // For code letter filtering
programRegistrationSchema.index({ programId: 1, isResultDeclared: 1 }); // For result queries
programRegistrationSchema.index({ teamId: 1, createdAt: -1 }); // For team-based queries with sorting

const ProgramRegistration =
  models.ProgramRegistration ||
  model("ProgramRegistration", programRegistrationSchema);

export default ProgramRegistration;
