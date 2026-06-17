import mongoose from "mongoose";

const financeSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ["Income", "Expense"],
      required: true,
    },
    invoiceNo: {
      type: String,
      required: true,
    },
    item: {
      type: String,
      required: false,
    },
    recipient: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    mode: {
      type: String,
      enum: ["Cash", "Bank"],
      required: true,
    },
    accountType: {
      type: String,
      enum: ["College", "Org", "Spark"],
      default: "College",
      required: true,
      required: true,
      index: true,
    },
    accountName: {
      type: String,
      required: false,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

// Index removed to allow duplicate invoice numbers as per user request
// financeSchema.index({ invoiceNo: 1, type: 1 }, { unique: true });

const Finance =
  mongoose.models.Finance || mongoose.model("Finance", financeSchema);

export default Finance;
