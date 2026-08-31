const express = require("express");

const {
  generateItinerary,
  replanItinerary,
} = require("../controllers/aiController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/generate-itinerary", generateItinerary);
router.post("/replan", replanItinerary);

module.exports = router;