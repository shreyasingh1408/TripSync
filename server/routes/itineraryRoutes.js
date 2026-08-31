const express = require("express");

const {
  getItinerary,
} = require("../controllers/itineraryController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/:tripId", getItinerary);

module.exports = router;