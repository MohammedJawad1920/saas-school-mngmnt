import { Schema, model, models } from "mongoose";
import User from "./User.js";

const batchSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9-]+$/,
        "Batch ID must only contain uppercase letters, numbers, and hyphens (-).",
      ],
    },
    name: {
      type: String,
      required: [true, "Batch name is required"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    startYear: {
      type: Number,
      required: true,
      min: [2000, "Start year cannot be before 2000"],
      max: [
        new Date().getFullYear() + 2,
        "Start year cannot be more than 2 years in future",
      ],
    },
    endYear: {
      type: Number,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startYear;
        },
        message: "End year must be after start year",
      },
    },
    students: [
      {
        type: String,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["Active", "Activated", "Acivated", "Graduated", "Stopped Out", "Accelerated"],
      default: "Acivated",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for graduation year format
batchSchema.virtual("academicYear").get(function () {
  if (!this.startYear || !this.endYear) return "";
  return `${this.startYear
    }-${(this.endYear % 100).toString().padStart(2, "0")}`;
});

// Virtual for student count
batchSchema.virtual("studentCount").get(function () {
  if (!this.students) return 0;
  return this.students.length;
});

// Compound index for year range
batchSchema.index({ startYear: 1, endYear: 1 });

// Pre-save validation
batchSchema.pre("save", function (next) {
  if (this.status === "Graduated" && this.endYear > new Date().getFullYear()) {
    return next(new Error("Cannot graduate a batch before end year"));
  }
  next();
});

const Batch = models.Batch || model("Batch", batchSchema);
export default Batch;
