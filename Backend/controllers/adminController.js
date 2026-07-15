const asyncHandler = require('express-async-handler');
const Item = require('../models/item');
const InventoryItem = require('../models/inventoryItem');
const Account = require('../models/account');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, ADMIN_ALLOWLIST } = require('../config');

exports.getItems = asyncHandler(async (req, res) => {
  const game = req.query.game || null;
  const query = {};
  if (game) query.game = game;
  const items = await Item.find(query).sort({ item_name: 1 }).lean();
  return res.json({ success: true, items });
});

// Admin spawn item into a user's inventory by item id
exports.spawnItem = asyncHandler(async (req, res) => {
  const { username, itemId } = req.body;
  if (!username || !itemId) return res.status(400).json({ success: false, message: 'username and itemId are required' });

  const account = await Account.findOne({ username: username.trim().toLowerCase() });
  if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

  const item = await Item.findById(itemId);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

  const existing = await InventoryItem.findOne({ owner: account._id, item: item._id });
  if (existing) {
    return res.status(409).json({ success: false, message: 'User already owns this item' });
  }

  const newInventory = await InventoryItem.create({ owner: account._id, item: item._id, locked: false, game: item.game || 'GAG2' });
  return res.json({ success: true, inventory: newInventory });
});

// Admin create giveaway from an Item id (creates inventory item under admin and starts giveaway)
exports.createGiveawayFromItem = asyncHandler(async (req, res) => {
  const { itemId, durationMs } = req.body;
  if (!itemId) return res.status(400).json({ success: false, message: 'itemId is required' });

  const item = await Item.findById(itemId);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

  // create inventory item owned by admin user
  const inventory = await InventoryItem.create({ owner: req.user.id, item: item._id, locked: true, game: item.game || 'GAG2' });

  const Giveaway = require('../models/giveaway');
  const newGw = new Giveaway({
    item: inventory._id,
    host: req.user.id,
    winner: null,
    game: inventory.game,
    endsAt: new Date().getTime() + Number(durationMs || 1800000),
    inactive: false,
    winnerImage: null,
    winnerName: null,
  });

  await newGw.save();

  return res.json({ success: true });
});

const normalizeName = (value) => (value || "").toString().trim().toLowerCase();

const isAdminUsername = (username) => {
  const normalized = normalizeName(username);
  return ADMIN_ALLOWLIST.includes(normalized);
};

const escapeRegex = (value) =>
  value.toString().replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");

const buildCaseInsensitiveUsernameQuery = (username) => ({
  username: {
    $regex: new RegExp(`^${escapeRegex(username)}$`, "i"),
  },
});

exports.impersonateUser = asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, message: 'username is required' });

  const currentAdmin = await Account.findById(req.user.id);
  if (!currentAdmin) {
    return res.status(403).json({ success: false, message: 'Admin impersonation not allowed' });
  }

  const normalizedAdminUsername = normalizeName(currentAdmin.username);
  const adminRank = currentAdmin.rank?.toString().trim().toLowerCase() || 'user';
  const isAllowedAdmin =
    isAdminUsername(normalizedAdminUsername) ||
    adminRank !== 'user';

  if (!isAllowedAdmin) {
    return res.status(403).json({ success: false, message: 'Admin impersonation not allowed' });
  }

  const targetUsername = normalizeName(username);
  const account = await Account.findOne(buildCaseInsensitiveUsernameQuery(targetUsername));
  if (!account) return res.status(404).json({ success: false, message: 'Target account not found' });

  const token = jwt.sign({ id: account._id, username: account.username }, JWT_SECRET);
  return res.json({ success: true, token });
});