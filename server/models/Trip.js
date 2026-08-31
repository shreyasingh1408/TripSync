const mongoose = require("mongoose");

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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Trip", tripSchema);