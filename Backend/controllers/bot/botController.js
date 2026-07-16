const asyncHandler = require("express-async-handler");
const Account = require("../../models/account");
const Item = require("../../models/item");
const InventoryItem = require("../../models/inventoryItem");
const GameWithdrawal = require("../../models/gameWithdrawal");
const Bot = require("../../models/bot");
const { BOT_KEY } = require("../../config");

const BOT_STATUS = {};
let NEXT_BOT_SLOT = 1;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

exports.get_bots_gag2 = asyncHandler(async (req, res) => {
  const bots = await Bot.find({ game: "GAG2" }).sort({ username: 1 }).lean();
  const now = Date.now();
  const results = bots.map((bot) => {
    const key = bot.username?.toLowerCase?.() || bot.username;
    const statusEntry = BOT_STATUS[key] || BOT_STATUS[bot.username] || null;
    const online = statusEntry && now - statusEntry.lastSeen < 120000;
    return {
      _id: bot._id,
      username: bot.username,
      thumbnail: bot.thumbnail || "",
      privateServer: bot.privateServer || "",
      status: online ? "Online" : "Offline",
      slot: statusEntry?.slot || bot.slot || 0,
      game: bot.game,
    };
  });
  return res.status(200).json({ bots: results });
});

exports.get_bots_ps99 = asyncHandler(async (req, res) => {
  return res.status(200).json({ bots: [] });
});

exports.add_gag2_bot = asyncHandler(async (req, res) => {
  const username = (req.body?.username || "").toString().trim();
  if (!username) {
    return res.status(400).json({ success: false, message: "Missing username" });
  }

  const existing = await Bot.findOne({
    game: "GAG2",
    username: { $regex: new RegExp(`^${escapeRegExp(username)}$`, "i") },
  }).exec();

  if (existing) {
    return res.status(409).json({ success: false, message: "Bot username already exists" });
  }

  const bot = await Bot.create({
    robloxId: "",
    username,
    thumbnail: "",
    privateServer: "",
    status: "Offline",
    game: "GAG2",
  });

  return res.status(201).json({ success: true, bot });
});

exports.remove_gag2_bot = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ success: false, message: "Missing bot id" });
  }

  const bot = await Bot.findById(id).exec();
  if (!bot) {
    return res.status(404).json({ success: false, message: "Bot not found" });
  }

  await Bot.findByIdAndDelete(id);
  return res.status(200).json({ success: true });
});

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function normalizeName(value) {
  if (value == null) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeKey(value) {
  return normalizeName(value).toLowerCase();
}

function getBotKeyFromHeaders(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === "string" && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  return req.headers["x-bot-key"] || req.headers["x-bot-key"];
}

function validateBotKey(req, res) {
  const key = getBotKeyFromHeaders(req);
  if (!key || key !== BOT_KEY) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return false;
  }
  return true;
}

async function findGag2ItemByName(name) {
  const normalized = normalizeName(name);
  if (!normalized) return null;

  const candidates = [normalized];
  const lower = normalizeKey(normalized);

  if (lower.startsWith("big ")) {
    candidates.push(normalized.slice(4));
  }
  if (lower.startsWith("huge ")) {
    candidates.push(normalized.slice(5));
  }
  if (lower.startsWith("mega ")) {
    candidates.push(normalized.slice(5));
  }
  if (lower.startsWith("rainbow ")) {
    candidates.push(normalized.slice(8));
  }
  if (!lower.endsWith(" seed")) {
    candidates.push(`${normalized} Seed`);
  }

  for (const candidate of candidates) {
    const regex = new RegExp(`^${escapeRegExp(candidate)}$`, "i");
    const item = await Item.findOne({
      game: "GAG2",
      $or: [
        { item_name: { $regex: regex } },
        { display_name: { $regex: regex } },
      ],
    }).exec();
    if (item) return item;
  }

  return null;
}

async function findAccountByIdentifier(identifier) {
  if (!identifier) return null;
  const normalized = normalizeName(identifier);
  if (!normalized) return null;

  const accountByUsername = await Account.findOne({
    username: { $regex: new RegExp(`^${escapeRegExp(normalized)}$`, "i") },
  }).exec();
  if (accountByUsername) return accountByUsername;

  return await Account.findOne({ robloxId: normalized }).exec();
}

exports.depositBot = asyncHandler(async (req, res) => {
  if (!validateBotKey(req, res)) return;

  const robloxUsername = req.body?.roblox_username;
  const items = req.body?.items;

  if (!robloxUsername || !Array.isArray(items)) {
    return res.status(400).json({ success: false, message: "Missing roblox_username or items" });
  }

  const account = await findAccountByIdentifier(robloxUsername);
  if (!account) {
    return res.status(404).json({ success: false, message: "Account not found" });
  }

  const inventoryDocs = [];
  let deposited = 0;
  let totalValue = 0;
  const errors = [];

  for (const item of items) {
    const itemName = normalizeName(item.name || item.display_name || item.item_name || item.ItemName || "");
    const qty = Number(item.qty ?? item.count ?? 1) || 1;
    if (!itemName || qty <= 0) {
      errors.push({ name: itemName, reason: "Invalid item data" });
      continue;
    }

    const itemDoc = await findGag2ItemByName(itemName);
    if (!itemDoc) {
      errors.push({ name: itemName, reason: "Item not found" });
      continue;
    }

    for (let i = 0; i < qty; i += 1) {
      inventoryDocs.push({
        item: itemDoc._id,
        owner: account._id,
        locked: false,
        game: "GAG2",
      });
    }
    deposited += qty;
    totalValue += qty * (Number(itemDoc.item_value) || 0);
  }

  if (inventoryDocs.length > 0) {
    await InventoryItem.insertMany(inventoryDocs);
    if (totalValue > 0) {
      await Account.updateOne({ _id: account._id }, { $inc: { deposited: totalValue } });
    }
  }

  return res.status(200).json({
    success: true,
    deposited,
    depositedValue: totalValue,
    errors,
  });
});

exports.pendingWithdrawals = asyncHandler(async (req, res) => {
  if (!validateBotKey(req, res)) return;

  const withdrawals = await GameWithdrawal.find({ game: "GAG2" })
    .populate({ path: "inventoryItem", populate: { path: "item" } })
    .exec();

  const results = [];
  for (const wd of withdrawals) {
    const account = await Account.findOne({ robloxId: wd.robloxId }).exec();
    results.push({
      id: String(wd._id),
      username: account?.username || wd.robloxId,
      robloxId: wd.robloxId,
      items: [
        {
          item_name: wd.item_name,
          display_name: wd.inventoryItem?.item?.display_name || wd.item_name,
          inventoryItemId: wd.inventoryItem?._id ? String(wd.inventoryItem._id) : null,
        },
      ],
    });
  }

  return res.status(200).json(results);
});

exports.completeWithdrawal = asyncHandler(async (req, res) => {
  if (!validateBotKey(req, res)) return;

  const id = req.body?.id;
  if (!id) {
    return res.status(400).json({ success: false, message: "Missing withdrawal id" });
  }

  const wd = await GameWithdrawal.findById(id)
    .populate({ path: "inventoryItem", populate: { path: "item" } })
    .exec();

  if (!wd) {
    return res.status(404).json({ success: false, message: "Withdrawal not found" });
  }

  if (wd.inventoryItem?._id) {
    await InventoryItem.updateOne({ _id: wd.inventoryItem._id }, { locked: true });
  }

  if (wd.inventoryItem?.item?.item_value) {
    const itemValue = Number(wd.inventoryItem.item.item_value) || 0;
    await Account.updateOne({ robloxId: wd.robloxId }, { $inc: { withdrawn: itemValue } });
  }

  await GameWithdrawal.findByIdAndDelete(id);

  return res.status(200).json({ success: true });
});

exports.ping = asyncHandler(async (req, res) => {
  if (!validateBotKey(req, res)) return;

  const username = normalizeName(req.body?.username);
  if (!username) {
    return res.status(400).json({ success: false, message: "Missing username" });
  }

  let status = BOT_STATUS[username];
  if (!status) {
    status = { username, slot: NEXT_BOT_SLOT, tx_count: 0, lastSeen: Date.now() };
    BOT_STATUS[username] = status;
    NEXT_BOT_SLOT += 1;
  }
  status.lastSeen = Date.now();

  return res.status(200).json({ slot: status.slot, tx_count: status.tx_count });
});

exports.txComplete = asyncHandler(async (req, res) => {
  if (!validateBotKey(req, res)) return;

  const username = normalizeName(req.body?.username);
  if (!username) {
    return res.status(400).json({ success: false, message: "Missing username" });
  }

  let status = BOT_STATUS[username];
  if (!status) {
    status = { username, slot: NEXT_BOT_SLOT, tx_count: 0, lastSeen: Date.now() };
    BOT_STATUS[username] = status;
    NEXT_BOT_SLOT += 1;
  }

  status.tx_count = (status.tx_count || 0) + 1;
  status.lastSeen = Date.now();

  return res.status(200).json({ tx_count: status.tx_count });
});

exports.nextBot = asyncHandler(async (req, res) => {
  if (!validateBotKey(req, res)) return;

  const excludeSlot = Number(req.query?.exclude_slot) || 0;
  const now = Date.now();
  const activeBots = Object.values(BOT_STATUS).filter(
    (status) => status.slot && status.slot !== excludeSlot && now - status.lastSeen < 120000
  );
  const bot = activeBots[0] || null;

  return res.status(200).json(bot ? { bot: { username: bot.username, slot: bot.slot } } : {});
});
