const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    time: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      required: true,
    },

    estimatedCost: {
      type: Number,
      default: 0,
    },

    duration: {
      type: String,
      default: "",
    },

    reason: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const daySchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: true,
    },

    date: {
      type: String,
      default: "",
    },

    activities: {
      type: [activitySchema],
      default: [],
    },

    estimatedDayCost: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const itinerarySchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      unique: true,
    },

    days: {
      type: [daySchema],
      default: [],
    },

    estimatedTotalCost: {
      type: Number,
      default: 0,
    },

    aiGenerated: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Itinerary", itinerarySchema);