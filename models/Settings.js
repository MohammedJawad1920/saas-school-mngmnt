// models/Settings.js
import { Schema, model, models } from "mongoose";

const SettingsSchema = new Schema(
  {
    general: {
      isWorkingDay: {
        type: Boolean,
        default: true,
        required: true,
      },
      occasion: {
        type: String,
        trim: true,
        default: "",
        required: function () {
          return !this.isWorkingDay;
        },
      },
    },
    institution: {
      name: { type: String, required: true, trim: true },
      fullName: { type: String, trim: true },
      tagline: { type: String, trim: true },
      address: { type: String, trim: true },
      contact: {
        primaryPhone: { type: String, trim: true },
        secondaryPhone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        website: { type: String, trim: true },
        whatsappChannel: { type: String, trim: true },
        youtube: { type: String, trim: true },
        instagram: { type: String, trim: true },
      },
      logo: {
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
      institutionPhoto: {
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
      updatesLogo: {
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
    },
    spark: {
      name: { type: String, trim: true },
      fullName: { type: String, trim: true },
      tagline: { type: String, trim: true },
      address: { type: String, trim: true },
      contact: {
        primaryPhone: { type: String, trim: true },
        secondaryPhone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        website: { type: String, trim: true },
      },
      logo: {
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
      committeePosters: [
        {
          year: {
            type: String,
            required: true,
          },
          poster: {
            url: {
              type: String,
              required: true,
            },
            publicId: {
              type: String,
            },
          },
        },
      ],
    },
    org: {
      name: { type: String, trim: true },
      fullName: { type: String, trim: true },
      tagline: { type: String, trim: true },
      address: { type: String, trim: true },
      contact: {
        primaryPhone: { type: String, trim: true },
        secondaryPhone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },
        website: { type: String, trim: true },
      },
      logo: {
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
      committeePosters: [
        {
          year: {
            type: String,
            required: true,
          },
          poster: {
            url: {
              type: String,
              required: true,
            },
            publicId: {
              type: String,
            },
          },
        },
      ],
    },
    idCard: {
      backgroundImage: {
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
    },
    festival: {
      festivalInfo: {
        name: {
          type: String,
          trim: true,
          default: "esperanza",
        },
        theme: {
          type: String,
          trim: true,
          default: "Recall the legacy, Reignite the light",
        },
        year: {
          type: Number,
          default: new Date().getFullYear(),
        },
        dates: {
          startDate: {
            type: Date,
          },
          endDate: {
            type: Date,
          },
        },
        venue: {
          type: String,
          trim: true,
          default: "Sa-adiya Da-awa College",
        },
      },
      festivalNameImage: {
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
      printHeader: {
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
      registrationDeadline: {
        type: Date,
      },

      participantsCard: {
        // Background image for participants card
        backgroundImage: {
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
        // Text color settings for participants card elements
        textColor: {
          type: String,
          default: "#000000",
          trim: true,
          validate: {
            validator: (v) =>
              !v || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v),
            message: "Invalid hex color format",
          },
        },
        textPositions: {
          right: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
          },
          bottom: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
          },
          left: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
          },
        },
      },
      instructions: {
        type: String,
        trim: true,
      },

      resultPosters: [
        {
          name: { type: String, default: "Default Poster" },
          backgroundImage: {
            url: String,
            publicId: String,
          },
          layout: {
            programInfo: {
              x: { type: Number, default: 50 },
              y: { type: Number, default: 5 },
              visible: { type: Boolean, default: true },
              fontSize: { type: Number, default: 14 },
              responsiveSize: { type: Boolean, default: true },
              minFontSize: { type: Number, default: 18 },
              maxFontSize: { type: Number, default: 32 },
              color: { type: String, default: "ffffff" },
              fontWeight: { type: String, default: "bold" },
              textAlign: { type: String, default: "center" },
              lineHeight: { type: Number, default: 1.1 },
              textShadow: { type: Boolean, default: false },
              autoFit: { type: Boolean, default: true },
            },
            divisionInfo: {
              x: { type: Number, default: 50 },
              y: { type: Number, default: 25 },
              visible: { type: Boolean, default: true },
              fontSize: { type: Number, default: 10 },
              responsiveSize: { type: Boolean, default: true },
              minFontSize: { type: Number, default: 14 },
              maxFontSize: { type: Number, default: 24 },
              color: { type: String, default: "ffffff" },
              fontWeight: { type: String, default: "normal" },
              textAlign: { type: String, default: "center" },
              lineHeight: { type: Number, default: 1.2 },
              textShadow: { type: Boolean, default: false },
              autoFit: { type: Boolean, default: true },
            },
            resultNumber: {
              x: { type: Number, default: 50 },
              y: { type: Number, default: 12 },
              visible: { type: Boolean, default: true },
              fontSize: { type: Number, default: 24 },
              responsiveSize: { type: Boolean, default: true },
              minFontSize: { type: Number, default: 14 },
              maxFontSize: { type: Number, default: 28 },
              color: { type: String, default: "ffffff" },
              fontWeight: { type: String, default: "bold" },
              textAlign: { type: String, default: "left" },
              lineHeight: { type: Number, default: 1.1 },
              letterSpacing: { type: Number, default: 0 },
              textShadow: { type: Boolean, default: false },
              prefix: { type: String, default: "" },
              autoFit: { type: Boolean, default: true },
            },
            firstPlace: {
              x: { type: Number, default: 50 },
              y: { type: Number, default: 35 },
              visible: { type: Boolean, default: true },
              fontSize: { type: Number, default: 12 },
              responsiveSize: { type: Boolean, default: true },
              minFontSize: { type: Number, default: 8 },
              maxFontSize: { type: Number, default: 24 },
              color: { type: String, default: "ffffff" },
              fontWeight: { type: String, default: "normal" },
              textAlign: { type: String, default: "left" },
              lineHeight: { type: Number, default: 1.2 },
              letterSpacing: { type: Number, default: 0 },
              nameSpacing: { type: Number, default: 8 },
              maxNameLength: { type: Number, default: 25 },
              textShadow: { type: Boolean, default: false },
              showRank: { type: Boolean, default: false },
              maxWinners: { type: Number, default: 1 },
              autoFit: { type: Boolean, default: true },
              containerPadding: { type: Number, default: 15 },
              teamNameSpacing: { type: Number, default: 0 },
              showTeamName: { type: Boolean, default: true },
            },
            secondPlace: {
              x: { type: Number, default: 50 },
              y: { type: Number, default: 60 },
              visible: { type: Boolean, default: true },
              fontSize: { type: Number, default: 12 },
              responsiveSize: { type: Boolean, default: true },
              minFontSize: { type: Number, default: 8 },
              maxFontSize: { type: Number, default: 24 },
              color: { type: String, default: "ffffff" },
              fontWeight: { type: String, default: "normal" },
              textAlign: { type: String, default: "left" },
              lineHeight: { type: Number, default: 1.3 },
              letterSpacing: { type: Number, default: 0 },
              nameSpacing: { type: Number, default: 6 },
              maxNameLength: { type: Number, default: 20 },
              textShadow: { type: Boolean, default: false },
              showRank: { type: Boolean, default: false },
              maxWinners: { type: Number, default: 1 },
              autoFit: { type: Boolean, default: true },
              containerPadding: { type: Number, default: 15 },
              teamNameSpacing: { type: Number, default: 0 },
              showTeamName: { type: Boolean, default: true },
            },
            thirdPlace: {
              x: { type: Number, default: 50 },
              y: { type: Number, default: 80 },
              visible: { type: Boolean, default: true },
              fontSize: { type: Number, default: 12 },
              responsiveSize: { type: Boolean, default: true },
              minFontSize: { type: Number, default: 8 },
              maxFontSize: { type: Number, default: 24 },
              color: { type: String, default: "ffffff" },
              fontWeight: { type: String, default: "normal" },
              textAlign: { type: String, default: "left" },
              lineHeight: { type: Number, default: 1.3 },
              letterSpacing: { type: Number, default: 0 },
              nameSpacing: { type: Number, default: 6 },
              maxNameLength: { type: Number, default: 20 },
              textShadow: { type: Boolean, default: false },
              showRank: { type: Boolean, default: false },
              maxWinners: { type: Number, default: 1 },
              autoFit: { type: Boolean, default: true },
              containerPadding: { type: Number, default: 15 },
              teamNameSpacing: { type: Number, default: 0 },
              showTeamName: { type: Boolean, default: true },
            },
          },
        },
      ],
    },
    years: {
      type: [String],
      default: ["2025 november"],
    },
    activeYear: {
      type: String,
      default: "2025 november",
    },
  },
  { timestamps: true }
);

// Ensure only one settings document exists
SettingsSchema.index({}, { unique: true });

// Check if model exists but is missing the new fields (Hot Reload fix)
if (models.Settings && (!models.Settings.schema.path("spark.committeePosters") || !models.Settings.schema.path("festival.festivalNameImage") || !models.Settings.schema.path("institution.contact.whatsappChannel"))) {
  console.log("Detecting outdated Settings model. Refreshing...");
  delete models.Settings;
}

const Settings = models.Settings || model("Settings", SettingsSchema);

export default Settings;
