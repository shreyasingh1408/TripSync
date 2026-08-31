const express = require("express");

const {
  getTripWeather,
} = require("../controllers/weatherController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/:tripId", getTripWeather);

module.exports = router;