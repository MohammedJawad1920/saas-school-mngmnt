import { Schema, model, models } from "mongoose";

const OTP_EXPIRATION_MINUTES = 5;
const MAX_ATTEMPTS = 3;

const otpSchema = new Schema({
  otp: {
    type: String,
    required: true,
    match: [/^\d{6}$/, "OTP must be a 6-digit number"],
  },
  email: {
    type: String,
    required: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    index: true,
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0,
    max: MAX_ATTEMPTS,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: OTP_EXPIRATION_MINUTES * 60,
  },
});

const OTP = models.OTP || model("OTP", otpSchema);
export default OTP;
