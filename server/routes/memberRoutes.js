const express = require("express");

const {
  addMember,
  getMembers,
  updateMember,
  deleteMember,
  joinTrip,
} = require("../controllers/memberController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/join", joinTrip);

router
  .route("/:tripId")
  .post(addMember)
  .get(getMembers);

router
  .route("/:tripId/:memberId")
  .put(updateMember)
  .delete(deleteMember);

module.exports = router;