import { Schema, model, models } from "mongoose";

const applicationFormSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    profilePic: {
      url: {
        type: String,
        trim: true,
        validate: {
          validator: (v) => !v || /^(http|https):\/\/[^ "]+$/.test(v),
          message: "Invalid URL format",
        },
      },
      publicId: {
        type: String,
      },
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    aadharNumber: {
      type: String,
      trim: true,
      validate: {
        validator: (v) => !v || /^\d{12}$/.test(v),
        message: "Invalid 12-digit Aadhar number",
      },
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => !v || /^\S+@\S+\.\S+$/.test(v),
        message: "Invalid email address",
      },
    },
    bloodGroup: {
      type: String,
      trim: true,
    },

    address: {
      houseName: { type: String, trim: true },
      place: { type: String, required: true, trim: true },
      postOffice: { type: String, trim: true },
      district: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      pin: {
        type: String,
        trim: true,
        validate: {
          validator: (v) => !v || /^\d{6}$/.test(v),
          message: "Invalid 6-digit PIN code",
        },
      },
    },
    guardianName: {
      type: String,
      trim: true,
    },
    guardianContactNumber: {
      type: String,
      trim: true,
      match: [/^(\+?\d{1,3}[-.\s]?)?\d{10,15}$/, "Invalid contact number"],
    },
    guardianAlternativeNumber: {
      type: String,
      trim: true,
      match: [/^(\+?\d{1,3}[-.\s]?)?\d{10,15}$/, "Invalid alternative number"],
    },
    relationship: {
      type: String,
      trim: true,
    },
    admissionClass: {
      type: String,
      trim: true,
    },
    academicStream: {
      type: String,
      trim: true,
      enum: ["Science", "Commerce", "Humanities"],
    },
    sslcRegistrationNumber: {
      type: String,
      trim: true,
    },
    sslcGraduationYear: {
      type: Number,
    },
    islamicEducationQualification: {
      type: String,
      trim: true,
    },
    academicEducationQualification: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Admitted"],
      default: "Pending",
    },
    decisionDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

if (models.ApplicationForm) {
  delete models.ApplicationForm;
}

const ApplicationForm = model("ApplicationForm", applicationFormSchema);

export default ApplicationForm;
