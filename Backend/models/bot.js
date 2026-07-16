const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const botSchema = new Schema({
  robloxId: { type: String, required: false, default: "" },
  username: { type: String, required: true },
  thumbnail: { type: String, required: false, default: "" },
  privateServer: { type: String, required: false, default: "" },
  status: { type: String, required: true, default: "Offline" },
  game: { type: String, required: true, index: true },
});

module.exports = mongoose.model("Bot", botSchema);
