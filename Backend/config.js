/** @format */

require('dotenv').config();

const JWT_SECRET = 'fwnqifnwquiohi421nkmcwqkcmwqkfwqkl';
// Use an alternate default port for local development to avoid conflicts.
const PORT = process.env.PORT || 3220;
const HCAPTCHA_SECRET =
  process.env.HCAPTCHA_SECRET || "0x0000000000000000000000000000000000000000";
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bloxpvp';
const TRANSACTION_SECRET = process.env.TRANSACTION_SECRET || "secret";
// Generated default bot key for local/dev. Override in production via the BOT_KEY env var.
const BOT_KEY = process.env.BOT_KEY || "bot_9d3a7f4b2c1e6a8f5b0c3d2e7a1f4b6c";
const XP_CONSTANT = process.env.XP_CONSTANT || 0.04;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || "";
const DISCORD_TICKET_CATEGORY_ID = process.env.DISCORD_TICKET_CATEGORY_ID || "";
const DISCORD_TICKET_SUPPORT_ROLE_ID = process.env.DISCORD_TICKET_SUPPORT_ROLE_ID || "";
const OWNER_ROBLOX_ID = process.env.OWNER_ROBLOX_ID?.trim() || "3547880550";
const OWNER_ROBLOX_USERNAME = process.env.OWNER_ROBLOX_USERNAME?.trim() || "BloxyGAG67";
const ADMIN_ALLOWLIST = process.env.ADMIN_ALLOWLIST
  ? process.env.ADMIN_ALLOWLIST.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)
  : [
      "welovemontana",
      "bloxpvp",
      "big_AMUNGUS666",
      "ineedvclolhaha",
      "4etg04",
      "blazakinai",
      "ninjawwr112ndalt",
    ];

module.exports = {
  JWT_SECRET,
  HCAPTCHA_SECRET,
  PORT,
  MONGODB_URI,
  TRANSACTION_SECRET,
  BOT_KEY,
  XP_CONSTANT,
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
  DISCORD_TICKET_CATEGORY_ID,
  DISCORD_TICKET_SUPPORT_ROLE_ID,
  OWNER_ROBLOX_ID,
  OWNER_ROBLOX_USERNAME,
  ADMIN_ALLOWLIST,
};
