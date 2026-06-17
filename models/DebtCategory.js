import mongoose from "mongoose";

const debtCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },
    createdBy: { type: String, ref: "User" }, // Org Admin user ID
  },
  { timestamps: true }
);

export default mongoose.models.DebtCategory ||
  mongoose.model("DebtCategory", debtCategorySchema);
