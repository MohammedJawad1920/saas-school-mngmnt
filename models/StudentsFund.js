import { Schema, model, models } from "mongoose";


const studentsFundSchema = new Schema(
  {
    studentId: {
      type: String,
      ref: "User",
    },
    teacherId: {
      type: String,
      ref: "User",
      // Required only if fundType is 'Individual'
    },
    department: {
      type: String,
      enum: [],
      // Required only if fundType is 'Department'
    },
    fundType: {
      type: String,
      enum: ["Individual", "Department"],
      default: "Individual",
      required: true,
    },
    batchId: {
      type: String,
      required: true,
      ref: "Batch",
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
    transactions: [
      {
        amount: {
          type: Number,
          required: true,
        },
        type: {
          type: String,
          required: true,
          enum: ["Deposit", "Withdrawal"],
        },
        note: {
          type: String,
        },
        performedBy: {
          type: String,
          ref: "User", // Track who actually performed the transaction
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound unique index for Individual funds (Teacher-specific)
studentsFundSchema.index(
  { studentId: 1, batchId: 1, teacherId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      studentId: { $exists: true },
      fundType: "Individual",
    },
  }
);

// Compound unique index for Department funds (Shared)
studentsFundSchema.index(
  { studentId: 1, batchId: 1, department: 1 },
  {
    unique: true,
    partialFilterExpression: {
      studentId: { $exists: true },
      fundType: "Department",
    },
  }
);

// Compound unique index for Batch-specific Individual funds
studentsFundSchema.index(
  { batchId: 1, teacherId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      studentId: { $exists: false },
      fundType: "Individual",
    },
  }
);

// Compound unique index for Batch-specific Department funds
studentsFundSchema.index(
  { batchId: 1, department: 1 },
  {
    unique: true,
    partialFilterExpression: {
      studentId: { $exists: false },
      fundType: "Department",
    },
  }
);

// Force model recompilation to apply schema changes in dev mode
if (models.StudentsFund) {
  delete models.StudentsFund;
}

const StudentsFund = model("StudentsFund", studentsFundSchema);

export default StudentsFund;
