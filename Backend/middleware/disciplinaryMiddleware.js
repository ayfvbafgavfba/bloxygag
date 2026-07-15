const { isUserBanned, isUserMuted } = require("../controllers/disciplinaryController");
const Account = require("../models/account");

/**
 * Middleware to check if user is banned
 */
exports.checkBanned = async (req, res, next) => {
  try {
    let username = req.user?.username || req.account?.username;
    if (!username && req.user?.id) {
      const account = await Account.findById(req.user.id);
      username = account?.username;
    }

    if (!username) {
      return next();
    }

    const isBanned = await isUserBanned(username);
    if (isBanned) {
      return res.status(403).json({ error: "You are banned from this action" });
    }

    next();
  } catch (error) {
    console.error("Error checking ban status:", error);
    next();
  }
};

/**
 * Middleware to check if user is muted
 */
exports.checkMuted = async (req, res, next) => {
  try {
    let username = req.user?.username || req.account?.username;
    if (!username && req.user?.id) {
      const account = await Account.findById(req.user.id);
      username = account?.username;
    }

    if (!username) {
      return next();
    }

    const isMuted = await isUserMuted(username);
    if (isMuted) {
      return res.status(403).json({ error: "You are muted and cannot perform this action" });
    }

    next();
  } catch (error) {
    console.error("Error checking mute status:", error);
    next();
  }
};
