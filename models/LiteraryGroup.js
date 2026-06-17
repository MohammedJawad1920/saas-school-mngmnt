import { model } from "mongoose";
import { models, Schema } from "mongoose";
import User from "./User";

const literaryGroupSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [
        /^[A-Z0-9-]+$/,
        "ID must only contain uppercase letters, numbers, and hyphens (-).",
      ],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    leaderId: {
      type: String,
      ref: "User",
    },
    assistantLeaderId: {
      type: String,
      ref: "User",
    },
    studentsId: {
      type: [String],
      required: true,
      ref: "User",
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one student is required",
      },
    },
  },
  { timestamps: true }
);

const LiteraryGroup =
  models.LiteraryGroup || model("LiteraryGroup", literaryGroupSchema);
export default LiteraryGroup;
