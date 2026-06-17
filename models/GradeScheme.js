import { Schema, model, models } from "mongoose";

const GradeSchemeSchema = new Schema(
  {
    markRange: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^(\d+)-(\d+)$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid mark range! It should be in the format 'min-max'.`,
      },
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    points: {
      type: Number,
      required: true,
      min: [0, "Points must be a positive value"],
    },
    year: {
      type: String,
      required: true,
      index: true,
      default: "2025 november",
    },
  },
  {
    timestamps: true,
  }
);

const GradeScheme =
  models.GradeScheme || model("GradeScheme", GradeSchemeSchema);
export default GradeScheme;
