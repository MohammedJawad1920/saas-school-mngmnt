import { model, models, Schema } from "mongoose";
import Participant from "./Participant";

const divisionSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (value) {
          return /^[A-Z0-9-]+$/.test(value);
        },
        message:
          "Division ID must only contain uppercase letters, numbers, and hyphens (-).",
      },
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
    type: {
      type: String,
      enum: ["Primary", "Secondary"],
      required: true,
      index: true,
    },
    subDivisions: {
      type: [String],
      ref: "Division",
      validate: {
        validator: function (value) {
          if (this.type === "Primary") {
            return value.length === 0;
          }
          if (this.type === "Secondary") {
            return value && value.length > 0;
          }
          return true;
        },
        message:
          "Sub Divisions are required when type is Secondary, and not allowed when type is Primary.",
      },
    },
    stageEvents: {
      type: Number,
      min: [0, "Stage events count must be positive"],
    },
    offStageEvents: {
      type: Number,
      min: [0, "Off-stage events count must be positive"],
    },
    chestNumberRange: {
      from: {
        type: Number,
        required: function () {
          return this.type === "Primary";
        },
        validate: {
          validator: function (value) {
            return value >= 0 && value <= this.chestNumberRange.to;
          },
          message:
            "Chest number range 'from' must be a non-negative number and less than or equal to 'to'.",
        },
      },
      to: {
        type: Number,
        required: function () {
          return this.type === "Primary";
        },
        validate: {
          validator: function (value) {
            return value >= 0 && value >= this.chestNumberRange.from;
          },
          message:
            "Chest number range 'to' must be a non-negative number and greater than or equal to 'from'.",
        },
      },
    },
    participantsId: {
      type: [String],
      ref: "Participant",
      default: [],
    },
    programsId: {
      type: [String],
      ref: "Program",
      default: [],
    },
  },

  { timestamps: true }
);

// Prevent overlaps before save
divisionSchema.pre("save", async function (next) {
  if (!this.isModified("chestNumberRange")) return next();

  const { from, to } = this.chestNumberRange;

  // Find any doc that overlaps
  const overlap = await this.constructor.findOne({
    _id: { $ne: this._id }, // ignore current doc
    $or: [
      {
        "chestNumberRange.from": { $lte: to },
        "chestNumberRange.to": { $gt: from },
      },
    ],
  });

  if (overlap) {
    return next(
      new Error(
        `Chest number range overlaps with existing range ${overlap.chestNumberRange.from}-${overlap.chestNumberRange.to}`
      )
    );
  }

  next();
});

divisionSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (!update.chestNumberRange) return next();

  const { from, to } = update.chestNumberRange;

  const overlap = await this.model.findOne({
    _id: { $ne: this.getQuery()._id },
    $or: [
      {
        "chestNumberRange.from": { $lte: to },
        "chestNumberRange.to": { $gt: from },
      },
    ],
  });

  if (overlap) {
    return next(
      new Error(
        `Chest number range overlaps with existing range ${overlap.chestNumberRange.from}-${overlap.chestNumberRange.to}`
      )
    );
  }

  next();
});

divisionSchema.index({ name: 1, year: 1 }, { unique: true });
divisionSchema.index({ _id: 1, year: 1 }, { unique: true });

const Division = models?.Division || model("Division", divisionSchema);

export default Division;
