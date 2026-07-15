const Disciplinary = require("../models/disciplinary");

/**
 * Check if a user is banned
 */
exports.isUserBanned = async (username) => {
  if (!username) return false;
  try {
    const record = await Disciplinary.findOne({
      username: username.toLowerCase(),
    });
    return record && record.isBanned;
  } catch (error) {
    console.error("Error checking ban status:", error);
    return false;
  }
};

/**
 * Check if a user is muted
 */
exports.isUserMuted = async (username) => {
  if (!username) return false;
  try {
    const record = await Disciplinary.findOne({
      username: username.toLowerCase(),
    });
    return record && record.isMuted;
  } catch (error) {
    console.error("Error checking mute status:", error);
    return false;
  }
};

/**
 * Ban a user (Admin only)
 */
exports.banUser = async (req, res) => {
  try {
    const { username, reason } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    const normalizedUsername = username.toLowerCase();
    let record = await Disciplinary.findOne({
      username: normalizedUsername,
    });

    if (!record) {
      record = new Disciplinary({ username: normalizedUsername });
    }

    if (record.isBanned) {
      return res.status(400).json({ error: "User is already banned" });
    }

    record.isBanned = true;
    record.banReason = reason || "No reason provided";
    record.bannedAt = new Date();
    record.bannedBy = req.user?.username || "admin";

    await record.save();
    res.json({ success: true, message: `${username} has been banned` });
  } catch (error) {
    console.error("Error banning user:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Unban a user (Admin only)
 */
exports.unbanUser = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    const normalizedUsername = username.toLowerCase();
    const record = await Disciplinary.findOne({
      username: normalizedUsername,
    });

    if (!record || !record.isBanned) {
      return res.status(400).json({ error: "User is not banned" });
    }

    record.isBanned = false;
    record.banReason = null;
    record.bannedAt = null;
    record.bannedBy = null;

    await record.save();
    res.json({ success: true, message: `${username} has been unbanned` });
  } catch (error) {
    console.error("Error unbanning user:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mute a user (Admin only)
 */
exports.muteUser = async (req, res) => {
  try {
    const { username, reason } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    const normalizedUsername = username.toLowerCase();
    let record = await Disciplinary.findOne({
      username: normalizedUsername,
    });

    if (!record) {
      record = new Disciplinary({ username: normalizedUsername });
    }

    if (record.isMuted) {
      return res.status(400).json({ error: "User is already muted" });
    }

    record.isMuted = true;
    record.muteReason = reason || "No reason provided";
    record.mutedAt = new Date();
    record.mutedBy = req.user?.username || "admin";

    await record.save();
    res.json({ success: true, message: `${username} has been muted` });
  } catch (error) {
    console.error("Error muting user:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Unmute a user (Admin only)
 */
exports.unmuteUser = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    const normalizedUsername = username.toLowerCase();
    const record = await Disciplinary.findOne({
      username: normalizedUsername,
    });

    if (!record || !record.isMuted) {
      return res.status(400).json({ error: "User is not muted" });
    }

    record.isMuted = false;
    record.muteReason = null;
    record.mutedAt = null;
    record.mutedBy = null;

    await record.save();
    res.json({ success: true, message: `${username} has been unmuted` });
  } catch (error) {
    console.error("Error unmuting user:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all banned users
 */
exports.getBannedUsers = async (req, res) => {
  try {
    const banned = await Disciplinary.find({ isBanned: true });
    res.json({
      success: true,
      banned: banned.map((record) => record.username),
    });
  } catch (error) {
    console.error("Error fetching banned users:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all muted users
 */
exports.getMutedUsers = async (req, res) => {
  try {
    const muted = await Disciplinary.find({ isMuted: true });
    res.json({
      success: true,
      muted: muted.map((record) => record.username),
    });
  } catch (error) {
    console.error("Error fetching muted users:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Check ban status (for frontend fallback)
 */
exports.checkBanStatus = async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    const record = await Disciplinary.findOne({
      username: username.toLowerCase(),
    });

    res.json({
      isBanned: record ? record.isBanned : false,
      isMuted: record ? record.isMuted : false,
    });
  } catch (error) {
    console.error("Error checking status:", error);
    res.status(500).json({ error: error.message });
  }
};
