const mongoose = require("mongoose");

const disciplinarySchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    banReason: String,
    muteReason: String,
    bannedAt: Date,
    mutedAt: Date,
    bannedBy: String,
    mutedBy: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Disciplinary", disciplinarySchema);
