const Trip = require("../models/Trip");

const addMember = async (req, res) => {
  try {
    const { name, ageGroup, interests, food, walking } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Member name is required",
      });
    }

    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    if (trip.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only trip creator can add members",
      });
    }

    trip.members.push({
      name,
      ageGroup,
      interests,
      food,
      walking,
    });

    await trip.save();

    res.status(201).json({
      message: "Member added successfully",
      members: trip.members,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getMembers = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    const isMember = trip.members.some(
      (member) =>
        member.user &&
        member.user.toString() === req.user._id.toString()
    );

    const isCreator =
      trip.creator.toString() === req.user._id.toString();

    if (!isCreator && !isMember) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    res.json({
      members: trip.members,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const updateMember = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    const member = trip.members.id(req.params.memberId);

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    if (trip.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only trip creator can update members",
      });
    }

    const allowedFields = [
      "name",
      "ageGroup",
      "interests",
      "food",
      "walking",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        member[field] = req.body[field];
      }
    });

    await trip.save();

    res.json({
      message: "Member updated successfully",
      member,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const deleteMember = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    if (trip.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only trip creator can remove members",
      });
    }

    const member = trip.members.id(req.params.memberId);

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    if (
      member.user &&
      member.user.toString() === trip.creator.toString()
    ) {
      return res.status(400).json({
        message: "Trip creator cannot be removed",
      });
    }

    member.deleteOne();

    await trip.save();

    res.json({
      message: "Member removed successfully",
      members: trip.members,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const joinTrip = async (req, res) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode) {
      return res.status(400).json({
        message: "Join code is required",
      });
    }

    const trip = await Trip.findOne({
      joinCode: joinCode.toUpperCase(),
    });

    if (!trip) {
      return res.status(404).json({
        message: "Invalid join code",
      });
    }

    const alreadyJoined = trip.members.some(
      (member) =>
        member.user &&
        member.user.toString() === req.user._id.toString()
    );

    if (alreadyJoined) {
      return res.status(400).json({
        message: "You have already joined this trip",
      });
    }

    trip.members.push({
      user: req.user._id,
      name: req.user.name,
    });

    await trip.save();

    res.json({
      message: "Trip joined successfully",
      trip,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  addMember,
  getMembers,
  updateMember,
  deleteMember,
  joinTrip,
};