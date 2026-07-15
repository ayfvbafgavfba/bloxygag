const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventSchema = new Schema({
  name: { type: String, required: true, default: "Wager Event" },
  description: { type: String, required: true, default: "Compete on the leaderboard by wagering items!" },
  status: { type: String, enum: ["active", "ended", "scheduled"], default: "scheduled" },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  prizes: {
    first: { type: Number, default: 25 }, // raccoons
    second: { type: Number, default: 12 }, // raccoons
    third: { type: Number, default: 5 }, // raccoons
    other: { type: Number, default: 50 }, // unicorns for top 3-10
  },
  totalWagered: { type: Number, default: 0 },
});

module.exports = mongoose.model("Event", eventSchema);
