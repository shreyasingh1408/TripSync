const Trip = require("../models/Trip");
const Itinerary = require("../models/Itinerary");

const getItinerary = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    const isCreator =
      trip.creator.toString() === req.user._id.toString();

    const isMember = trip.members.some(
      (member) =>
        member.user &&
        member.user.toString() === req.user._id.toString()
    );

    if (!isCreator && !isMember) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    const itinerary = await Itinerary.findOne({
      tripId: req.params.tripId,
    });

    if (!itinerary) {
      return res.status(404).json({
        message: "Itinerary not generated yet",
      });
    }

    res.json({
      itinerary,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getItinerary,
};