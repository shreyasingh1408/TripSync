const Trip = require("../models/Trip");

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

    if (new Date(endDate) < new Date(startDate)) {
      return res.status(400).json({
        message: "End date cannot be before start date",
      });
    }

    const trip = await Trip.create({
      creator: req.user._id,
      destination,
      startDate,
      endDate,
      tripType,
      travellers,
      budget,
      preferences,
    });

    res.status(201).json({
      message: "Trip created successfully",
      trip,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({
      creator: req.user._id,
    }).sort({ createdAt: -1 });

    res.json({
      trips,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    if (trip.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to access this trip",
      });
    }

    res.json({
      trip,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    if (trip.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to update this trip",
      });
    }

    Object.assign(trip, req.body);

    if (new Date(trip.endDate) < new Date(trip.startDate)) {
      return res.status(400).json({
        message: "End date cannot be before start date",
      });
    }

    const updatedTrip = await trip.save();

    res.json({
      message: "Trip updated successfully",
      trip: updatedTrip,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    if (trip.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to delete this trip",
      });
    }

    await trip.deleteOne();

    res.json({
      message: "Trip deleted successfully",
    });
  } catch (error) {
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