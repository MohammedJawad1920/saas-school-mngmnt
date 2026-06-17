import { Schema, model, models } from "mongoose";

const paymentSchema = new Schema({
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    date: {
        type: Date,
        required: true
    }
}, { _id: false });

const studentCouponSchema = new Schema({
    studentId: {
        type: String,
        ref: "User",
        required: true
    },
    academicYear: {
        type: String,
        required: true,
        trim: true
    },
    couponNumber: {
        type: String,
        required: false,
        trim: true,
        uppercase: true
    },
    couponAmount: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    payments: [paymentSchema],
    status: {
        type: String,
        enum: ["Paid", "Partial", "Pending"],
        default: "Pending"
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for total paid
studentCouponSchema.virtual("totalPaid").get(function () {
    if (!this.payments || this.payments.length === 0) return 0;
    return this.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
});

// Virtual for balance
studentCouponSchema.virtual("balance").get(function () {
    return this.couponAmount - (this.totalPaid || 0);
});

// Update status before saving
studentCouponSchema.pre("save", function (next) {
    // Calculate total paid manually since virtuals might not be available in pre-save
    const totalPaid = this.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

    if (totalPaid >= this.couponAmount) {
        this.status = "Paid";
    } else if (totalPaid > 0) {
        this.status = "Partial";
    } else {
        this.status = "Pending";
    }
    next();
});

// Force recompilation of model to apply schema changes (Remove in production if stable)
if (models.StudentCoupon) delete models.StudentCoupon;

const StudentCoupon = model("StudentCoupon", studentCouponSchema);
export default StudentCoupon;
