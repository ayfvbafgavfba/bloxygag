const asyncHandler = require("express-async-handler");
const PromoCode = require("../models/promoCode");
const Account = require("../models/account");
const Item = require("../models/item");
const InventoryItem = require("../models/inventoryItem");

const normalizeUsername = (value) => (value || "").trim().toLowerCase();

exports.createPromoCode = asyncHandler(async (req, res) => {
  const { code, targetUsername, itemName, usesRemaining, rewardValue, rewardType } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, message: "A promo code is required." });
  }

  const existing = await PromoCode.findOne({ code: code.trim().toUpperCase() });
  if (existing) {
    return res.status(409).json({ success: false, message: "That promo code already exists." });
  }

  const normalizedTarget = targetUsername ? normalizeUsername(targetUsername) : null;
  const uses = Number(usesRemaining || 1);
  const type = itemName ? "item" : rewardType || "balance";
  const quantity = Math.max(1, Number(rewardValue || (type === "item" ? 1 : 0)));
  const promo = await PromoCode.create({
    code: code.trim().toUpperCase(),
    createdBy: req.user?.id || null,
    targetUsername: normalizedTarget,
    itemName: itemName || null,
    usesRemaining: uses,
    maxUses: uses,
    rewardType: type,
    rewardValue: quantity,
  });

  return res.status(201).json({ success: true, promo });
});

exports.deletePromoCode = asyncHandler(async (req, res) => {
  const code = (req.params.code || "").trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ success: false, message: "A promo code is required." });
  }

  const promo = await PromoCode.findOneAndDelete({ code });
  if (!promo) {
    return res.status(404).json({ success: false, message: "Promo code not found." });
  }

  return res.json({ success: true, message: "Promo code deleted." });
});

exports.listPromoCodes = asyncHandler(async (req, res) => {
  const promos = await PromoCode.find({}).sort({ createdAt: -1 }).lean();
  return res.json({ success: true, promos });
});

exports.redeemPromoCode = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: "A promo code is required." });
  }

  const promo = await PromoCode.findOne({ code: code.trim().toUpperCase() });
  if (!promo) {
    return res.status(404).json({ success: false, message: "Promo code not found." });
  }

  if (promo.status !== "active") {
    return res.status(400).json({ success: false, message: "This promo code is no longer active." });
  }

  if (promo.usesRemaining <= 0) {
    return res.status(400).json({ success: false, message: "This promo code has no uses remaining." });
  }

  const account = await Account.findById(req.user.id);
  if (!account) {
    return res.status(404).json({ success: false, message: "Account not found." });
  }

  const normalizedAccountUsername = normalizeUsername(account.username);
  if (promo.targetUsername && normalizedAccountUsername !== normalizeUsername(promo.targetUsername)) {
    return res.status(403).json({ success: false, message: "This promo code is not available for your account." });
  }

  if (promo.redeemedBy.includes(normalizedAccountUsername)) {
    return res.status(400).json({ success: false, message: "You have already redeemed this code." });
  }

  if (promo.rewardType === "item") {
    const item = await Item.findOne({
      item_name: { $regex: `^${promo.itemName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (!item) {
      return res.status(404).json({ success: false, message: `Item '${promo.itemName}' not found.` });
    }

    const quantity = Math.max(1, Number(promo.rewardValue || 1));
    for (let index = 0; index < quantity; index += 1) {
      await InventoryItem.create({
        owner: account._id,
        item: item._id,
        locked: false,
        game: item.game || "GAG2",
      });
    }
  }

  promo.usesRemaining -= 1;
  promo.redeemedBy.push(normalizedAccountUsername);
  if (promo.usesRemaining <= 0) {
    promo.status = "used";
  }
  await promo.save();

  if (promo.rewardType === "balance") {
    account.balance += Number(promo.rewardValue || 0);
    await account.save();
  }

  return res.json({
    success: true,
    message: `Promo code redeemed successfully.`,
    promo: {
      code: promo.code,
      usesRemaining: promo.usesRemaining,
      itemName: promo.itemName,
      rewardType: promo.rewardType,
      rewardValue: promo.rewardValue,
    },
  });
});
