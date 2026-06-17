import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    amount:    { type: Number, required: true, min: 0 },
    date:      { type: Date,   required: true },
    note:      { type: String, trim: true },
    paidBy:    { type: String, ref: "User" }, // who recorded the payment
  },
  { _id: true }
);

const debtorSchema = new mongoose.Schema(
  {
    studentId:  { type: String, required: true, ref: "User", index: true },
    batchId:    { type: String, ref: "Batch", index: true },
    classId:    { type: String, ref: "Class", index: true },
    category:   { type: String, required: true, trim: true, uppercase: true },
    year:       { type: String, required: true, trim: true }, // e.g. "2024-25"
    totalAmount:{ type: Number, required: true, min: 0 },
    payments:   [paymentSchema],
    note:       { type: String, trim: true },
    createdBy:  { type: String, ref: "User" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual: total paid
debtorSchema.virtual("totalPaid").get(function () {
  return this.payments.reduce((sum, p) => sum + p.amount, 0);
});

// Virtual: balance remaining
debtorSchema.virtual("balance").get(function () {
  return this.totalAmount - this.totalPaid;
});

// Virtual: status
debtorSchema.virtual("status").get(function () {
  const paid = this.payments.reduce((sum, p) => sum + p.amount, 0);
  if (paid >= this.totalAmount) return "Paid";
  if (paid > 0) return "Partial";
  return "Pending";
});

debtorSchema.index({ studentId: 1, category: 1, year: 1 });

if (mongoose.models.Debtor) delete mongoose.models.Debtor;
export default mongoose.model("Debtor", debtorSchema);
