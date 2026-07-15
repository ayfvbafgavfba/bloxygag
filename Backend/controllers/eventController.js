const asyncHandler = require("express-async-handler");
const Event = require("../models/event");
const EventParticipant = require("../models/eventParticipant");

// Get active event and leaderboard
exports.get_active_event = asyncHandler(async (req, res) => {
  try {
    const now = new Date();
    
    const activeEvent = await Event.findOne({
      status: "active",
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (!activeEvent) {
      return res.status(200).json({ event: null, leaderboard: [] });
    }

    // Get leaderboard
    const leaderboard = await EventParticipant.find({ eventId: activeEvent._id })
      .sort({ totalWagered: -1 })
      .limit(10)
      .select("username totalWagered rank prizeType prizeAmount");

    // Add rank to leaderboard entries
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry.toObject(),
      rank: index + 1,
    }));

    res.status(200).json({ event: activeEvent, leaderboard: rankedLeaderboard });
  } catch (error) {
    console.error("Error getting active event:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add or update user wager
exports.update_user_wager = asyncHandler(async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid wager amount" });
    }

    const now = new Date();
    const activeEvent = await Event.findOne({
      status: "active",
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (!activeEvent) {
      return res.status(400).json({ message: "No active event" });
    }

    // Update or create participant
    const participant = await EventParticipant.findOneAndUpdate(
      { eventId: activeEvent._id, userId },
      {
        $inc: { totalWagered: amount },
        username,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Update event total wagered
    await Event.findByIdAndUpdate(
      activeEvent._id,
      { $inc: { totalWagered: amount } }
    );

    res.status(200).json({ success: true, participant });
  } catch (error) {
    console.error("Error updating wager:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: Create event
exports.create_event = asyncHandler(async (req, res) => {
  try {
    const { durationMinutes, name, description } = req.body;

    if (!durationMinutes || durationMinutes <= 0) {
      return res.status(400).json({ message: "Invalid duration" });
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    const event = new Event({
      name: name || "Wager Event",
      description: description || "Compete on the leaderboard by wagering items!",
      status: "active",
      startDate,
      endDate,
    });

    await event.save();
    res.status(201).json({ success: true, event });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin: End event and distribute prizes
exports.end_event = asyncHandler(async (req, res) => {
  try {
    const { eventId } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Get top 10 participants
    const participants = await EventParticipant.find({ eventId })
      .sort({ totalWagered: -1 })
      .limit(10);

    // Distribute prizes
    for (let i = 0; i < participants.length; i++) {
      let prizeType = "none";
      let prizeAmount = 0;

      if (i === 0) {
        prizeType = "raccoon";
        prizeAmount = event.prizes.first;
      } else if (i === 1) {
        prizeType = "raccoon";
        prizeAmount = event.prizes.second;
      } else if (i === 2) {
        prizeType = "raccoon";
        prizeAmount = event.prizes.third;
      } else if (i >= 3 && i <= 9) {
        prizeType = "unicorn";
        prizeAmount = event.prizes.other;
      }

      await EventParticipant.findByIdAndUpdate(participants[i]._id, {
        rank: i + 1,
        prizeType,
        prizeAmount,
      });
    }

    // Update event status
    event.status = "ended";
    event.endDate = new Date();
    await event.save();

    res.status(200).json({ success: true, event });
  } catch (error) {
    console.error("Error ending event:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get event history
exports.get_event_history = asyncHandler(async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).limit(10);
    res.status(200).json({ events });
  } catch (error) {
    console.error("Error getting event history:", error);
    res.status(500).json({ message: "Server error" });
  }
});
