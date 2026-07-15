const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventParticipantSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
  username: { type: String, required: true },
  totalWagered: { type: Number, default: 0 },
  rank: { type: Number },
  prizeClaimed: { type: Boolean, default: false },
  prizeAmount: { type: Number, default: 0 },
  prizeType: { type: String, enum: ["raccoon", "unicorn", "none"], default: "none" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("EventParticipant", eventParticipantSchema);
