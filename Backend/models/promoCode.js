const mongoose = require("mongoose");

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  createdBy: { type: String, default: null },
  targetUsername: { type: String, default: null },
  itemName: { type: String, default: null },
  usesRemaining: { type: Number, default: 1 },
  maxUses: { type: Number, default: 1 },
  redeemedBy: [{ type: String, default: [] }],
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  status: { type: String, default: "active" },
  rewardType: { type: String, default: "balance" },
  rewardValue: { type: Number, default: 0 },
});

module.exports = mongoose.model("PromoCode", promoCodeSchema);
