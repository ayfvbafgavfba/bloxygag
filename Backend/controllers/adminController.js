const asyncHandler = require('express-async-handler');
const Item = require('../models/item');
const InventoryItem = require('../models/inventoryItem');
const Account = require('../models/account');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, ADMIN_ALLOWLIST, OWNER_ROBLOX_ID, OWNER_ROBLOX_USERNAME } = require('../config');
const { buildItemPayload } = require('../utils/itemHelpers');

const escapeForRegex = (value) => String(value).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

exports.getItems = asyncHandler(async (req, res) => {
  const game = (req.query.game || '').toString().trim().toUpperCase();
  const includeAll = req.query.all === 'true' || req.query.includeAll === 'true';

  const query = {};
  if (game) {
    query.game = game;
  } else if (!includeAll) {
    query.game = 'GAG2';
  }

  const items = await Item.find(query).sort({ item_name: 1 }).lean();
  return res.json({ success: true, items });
});

// Admin spawn item into a user's inventory by item id
exports.spawnItem = asyncHandler(async (req, res) => {
  const { username, itemId } = req.body;
  if (!username || !itemId) return res.status(400).json({ success: false, message: 'username and itemId are required' });

  // Do a case-insensitive lookup for username (safe-escaped)
  const raw = String(username || "").trim();
  const escapeForRegex = (v) => String(v).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  const account = await Account.findOne({ username: { $regex: new RegExp(`^${escapeForRegex(raw)}$`, 'i') } });
  if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

  const item = await Item.findById(itemId);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

  const newInventory = await InventoryItem.create({ owner: account._id, item: item._id, locked: false, game: item.game || 'GAG2' });
  return res.json({ success: true, inventory: newInventory });
});

exports.resetInventory = asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ success: false, message: 'username is required' });

  const raw = String(username || '').trim();
  const account = await Account.findOne({ username: { $regex: new RegExp(`^${escapeForRegex(raw)}$`, 'i') } });
  if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

  const result = await InventoryItem.deleteMany({ owner: account._id });
  return res.json({ success: true, deletedCount: result.deletedCount || 0 });
});

exports.createItem = asyncHandler(async (req, res) => {
  const { name, displayName, itemValue, game, itemType, itemImage } = req.body;
  const itemName = String(name || '').trim();

  if (!itemName) {
    return res.status(400).json({ success: false, message: 'name is required' });
  }

  const payload = buildItemPayload({
    name: itemName,
    displayName,
    itemValue,
    game,
    itemType,
    itemImage,
  });

  const existing = await Item.findOne({ item_name: itemName, game: payload.game });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Item already exists for that game' });
  }

  const created = await Item.create(payload);
  return res.status(201).json({ success: true, item: created });
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

const buildCaseInsensitiveUsernameQuery = (username) => ({
  username: {
    $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}$`, "i"),
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

// Admin: list withdrawals (pending/manual/all)
exports.get_withdrawals = asyncHandler(async (req, res) => {
  const GameWithdrawal = require('../models/gameWithdrawal');
  const withdrawals = await GameWithdrawal.find({ game: 'GAG2' })
    .populate({ path: 'inventoryItem', populate: { path: 'item' } })
    .exec();

  const pending = [];
  const manual = [];
  const all = [];

  for (const wd of withdrawals) {
    const itemName = (wd.item_name || '').toString();
    const lower = itemName.toLowerCase();
    const isManual = lower.startsWith('big ') || lower.startsWith('huge ') || lower.startsWith('mega ') || lower.startsWith('rainbow ');
    const rec = {
      id: String(wd._id),
      robloxId: wd.robloxId,
      item_name: wd.item_name,
      inventoryItemId: wd.inventoryItem?._id ? String(wd.inventoryItem._id) : null,
    };
    all.push(rec);
    if (isManual) manual.push(rec);
    else pending.push(rec);
  }

  return res.json({ success: true, pending, manual, all });
});

const findTaxAccount = async () => {
  const fallbackRobloxId = '5329316694';
  if (OWNER_ROBLOX_ID) {
    const byId = await Account.findOne({ robloxId: OWNER_ROBLOX_ID });
    if (byId) return byId;
  }
  if (OWNER_ROBLOX_USERNAME) {
    const byName = await Account.findOne({ username: { $regex: new RegExp(`^${escapeRegex(OWNER_ROBLOX_USERNAME)}$`, 'i') } });
    if (byName) return byName;
  }
  return await Account.findOne({ robloxId: fallbackRobloxId });
};

exports.get_taxed_items = asyncHandler(async (req, res) => {
  const taxer = await findTaxAccount();
  if (!taxer) return res.status(404).json({ success: false, message: 'Tax account not found' });

  const taxedInventory = await InventoryItem.find({ owner: taxer._id }).populate('item').lean();
  const grouped = {};

  for (const inventoryItem of taxedInventory) {
    const item = inventoryItem.item || {};
    const itemName = (item.item_name || 'Unknown').toString();
    const game = item.game || 'GAG2';
    const itemType = item.item_type || (itemName.toLowerCase().includes('seed') ? 'seed' : 'pet');
    const key = `${itemName}||${game}`;

    if (!grouped[key]) {
      grouped[key] = {
        itemName,
        game,
        itemType,
        count: 0,
        image: item.item_image || item.image || "",
      };
    }

    grouped[key].count += 1;
  }

  return res.json({ success: true, taxedItems: Object.values(grouped) });
});

exports.delete_taxed_items = asyncHandler(async (req, res) => {
  const { itemName, quantity = 1, game } = req.body;
  if (!itemName) return res.status(400).json({ success: false, message: 'itemName is required' });
  const deleteAmount = Number(quantity) || 1;
  if (deleteAmount < 1) return res.status(400).json({ success: false, message: 'quantity must be at least 1' });

  const taxer = await findTaxAccount();
  if (!taxer) return res.status(404).json({ success: false, message: 'Tax account not found' });

  const itemQuery = { item_name: itemName };
  if (game) itemQuery.game = game;
  const item = await Item.findOne(itemQuery).lean();
  if (!item) return res.status(404).json({ success: false, message: 'Item not found for deletion' });

  const taxedInventoryItems = await InventoryItem.find({ owner: taxer._id, item: item._id })
    .sort({ _id: 1 })
    .limit(deleteAmount)
    .lean();

  if (taxedInventoryItems.length === 0) {
    return res.status(404).json({ success: false, message: 'No taxed items found to delete for this item' });
  }

  const idsToRemove = taxedInventoryItems.map((inventoryItem) => inventoryItem._id);
  await InventoryItem.deleteMany({ _id: { $in: idsToRemove } });

  return res.json({ success: true, deleted: idsToRemove.length });
});

// Admin: complete a withdrawal (manual action via admin panel)
exports.complete_withdrawal = asyncHandler(async (req, res) => {
  const ids = [];
  if (req.body?.id) {
    if (typeof req.body.id === 'string' && req.body.id.includes(',')) {
      ids.push(...req.body.id.split(',').map((id) => id.trim()).filter(Boolean));
    } else {
      ids.push(String(req.body.id));
    }
  }
  if (Array.isArray(req.body?.ids)) ids.push(...req.body.ids.map(String));
  if (ids.length === 0) return res.status(400).json({ success: false, message: 'Missing id or ids' });

  const GameWithdrawal = require('../models/gameWithdrawal');
  const InventoryItem = require('../models/inventoryItem');

  const uniqueIds = Array.from(new Set(ids));
  const withdrawals = await GameWithdrawal.find({ _id: { $in: uniqueIds } })
    .populate({ path: 'inventoryItem', populate: { path: 'item' } })
    .exec();

  if (!withdrawals || withdrawals.length === 0) {
    return res.status(404).json({ success: false, message: 'Withdrawal(s) not found' });
  }

  const inventoryIdsToLock = [];
  const accountWithdrawTotals = new Map();

  for (const wd of withdrawals) {
    if (wd.inventoryItem?._id) {
      inventoryIdsToLock.push(wd.inventoryItem._id);
    }
    const itemValue = Number(wd.inventoryItem?.item?.item_value) || 0;
    if (itemValue && wd.robloxId) {
      accountWithdrawTotals.set(wd.robloxId, (accountWithdrawTotals.get(wd.robloxId) || 0) + itemValue);
    }
  }

  if (inventoryIdsToLock.length > 0) {
    await InventoryItem.updateMany(
      { _id: { $in: inventoryIdsToLock } },
      { locked: true }
    );
  }

  for (const [robloxId, amount] of accountWithdrawTotals.entries()) {
    await Account.updateOne({ robloxId }, { $inc: { withdrawn: amount } });
  }

  await GameWithdrawal.deleteMany({ _id: { $in: uniqueIds } });
  return res.json({ success: true, completed: withdrawals.length });
});