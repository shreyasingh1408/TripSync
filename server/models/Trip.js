const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    ageGroup: {
      type: String,
      enum: ["child", "adult", "senior"],
      default: "adult",
    },

    interests: {
      type: [String],
      default: [],
    },

    food: {
      type: String,
      default: "",
    },

    walking: {
      type: String,
      enum: ["low", "medium", "high", ""],
      default: "",
    },
  },
  {
    _id: true,
  }
);

const tripSchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    destination: {
      type: String,
      required: true,
      trim: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    tripType: {
      type: String,
      enum: ["solo", "couple", "family", "group"],
      required: true,
    },

    travellers: {
      type: Number,
      required: true,
      min: 1,
    },

    budget: {
      type: Number,
      required: true,
      min: 0,
    },

    joinCode: {
      type: String,
      unique: true,
      sparse: true,
    },

    preferences: {
      interests: {
        type: [String],
        default: [],
      },

      food: {
        type: String,
        default: "",
      },

      walking: {
        type: String,
        enum: ["low", "medium", "high", ""],
        default: "",
      },

      travelStyle: {
        type: String,
        enum: ["relaxed", "balanced", "packed", ""],
        default: "",
      },
    },

    members: {
      type: [memberSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Trip", tripSchema);