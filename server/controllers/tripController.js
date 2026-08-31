const Trip = require("../models/Trip");

// Generate a random 6-character join code
const generateJoinCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ======================================================
// CREATE TRIP
// POST /api/trips
// ======================================================
const createTrip = async (req, res) => {
  try {
    const {
      destination,
      startDate,
      endDate,
      tripType,
      travellers,
      budget,
      preferences,
    } = req.body;

    // Required field validation
    if (
      !destination ||
      !startDate ||
      !endDate ||
      !tripType ||
      !travellers ||
      budget === undefined
    ) {
      return res.status(400).json({
        message: "Please provide all required trip fields",
      });
    }

    // Validate dates
    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        message: "End date cannot be before start date",
      });
    }

    // Generate unique join code
    let joinCode;
    let codeExists = true;

    while (codeExists) {
      joinCode = generateJoinCode();

      const existingTrip = await Trip.findOne({
        joinCode,
      });

      codeExists = !!existingTrip;
    }

    // Create trip
    const trip = await Trip.create({
      creator: req.user._id,

      destination,
      startDate,
      endDate,
      tripType,
      travellers,
      budget,

      preferences: preferences || {},

      joinCode,

      // Creator automatically becomes first member
      members: [
        {
          user: req.user._id,
          name: req.user.name,
          ageGroup: "adult",
          interests: preferences?.interests || [],
          food: preferences?.food || "",
          walking: preferences?.walking || "",
        },
      ],
    });

    res.status(201).json({
      message: "Trip created successfully",
      trip,
    });
  } catch (error) {
    console.error("Create trip error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// GET ALL USER TRIPS
// GET /api/trips
// Creator + Joined Trips
// ======================================================
const getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({
      $or: [
        {
          creator: req.user._id,
        },
        {
          "members.user": req.user._id,
        },
      ],
    })
      .populate("creator", "name email")
      .sort({
        createdAt: -1,
      });

    res.status(200).json({
      count: trips.length,
      trips,
    });
  } catch (error) {
    console.error("Get trips error:", error);

    res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// GET SINGLE TRIP
// GET /api/trips/:id
// ======================================================
const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate("creator", "name email")
      .populate("members.user", "name email");

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    // Check if current user is creator
    const isCreator =
      trip.creator._id.toString() === req.user._id.toString();

    // Check if current user is member
    const isMember = trip.members.some(
      (member) =>
        member.user &&
        member.user._id.toString() === req.user._id.toString()
    );

    if (!isCreator && !isMember) {
      return res.status(403).json({
        message: "Not authorized to access this trip",
      });
    }

    res.status(200).json({
      trip,
    });
  } catch (error) {
    console.error("Get trip error:", error);

    // Invalid MongoDB ObjectId
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid trip ID",
      });
    }

    res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// UPDATE TRIP
// PUT /api/trips/:id
// Only creator can update trip
// ======================================================
const updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    // Only creator can edit main trip details
    if (trip.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only trip creator can update this trip",
      });
    }

    // Only allow these fields to be updated
    const allowedFields = [
      "destination",
      "startDate",
      "endDate",
      "tripType",
      "travellers",
      "budget",
      "preferences",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        trip[field] = req.body[field];
      }
    });

    // Date validation after update
    if (new Date(trip.endDate) < new Date(trip.startDate)) {
      return res.status(400).json({
        message: "End date cannot be before start date",
      });
    }

    await trip.save();

    res.status(200).json({
      message: "Trip updated successfully",
      trip,
    });
  } catch (error) {
    console.error("Update trip error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid trip ID",
      });
    }

    res.status(500).json({
      message: error.message,
    });
  }
};

// ======================================================
// DELETE TRIP
// DELETE /api/trips/:id
// Only creator can delete trip
// ======================================================
const deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    // Only creator can delete trip
    if (trip.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only trip creator can delete this trip",
      });
    }

    await trip.deleteOne();

    res.status(200).json({
      message: "Trip deleted successfully",
    });
  } catch (error) {
    console.error("Delete trip error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid trip ID",
      });
    }

    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  deleteTrip,
};