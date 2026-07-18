const asyncHandler = require("express-async-handler");
const { body, validationResult } = require("express-validator");
const Account = require("../models/account");
const { emitEvent, emitBalanceUpdate } = require("../utils/events");
const { Webhook } = require("discord-webhook-node");

// Replace this with the webhook the user provided
const tipHook = new Webhook(
  "https://discord.com/api/webhooks/1527832771546976347/SKn5dyjVW8LBA7UrwYjjg1iKj82c-BZjllzefxP-ayqCBtXGW8qpIqJQkJqHFdQU-01q"
);
tipHook.setUsername("BLOXPVP-TIP");

exports.send_tip = [
  body("recipientRobloxId").trim().escape(),
  body("amount").toFloat(),
  asyncHandler(async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: "Invalid input" });
      }

      const sender = await Account.findById(req.user.id).exec();
      if (!sender) return res.status(404).json({ success: false, message: "Sender not found" });

      const recipientRobloxId = String(req.body.recipientRobloxId || "").trim();
      const amount = Number(req.body.amount || 0);

      if (!recipientRobloxId || amount <= 0 || isNaN(amount)) {
        return res.status(422).json({ success: false, message: "Invalid recipient or amount" });
      }

      const recipient = await Account.findOne({ robloxId: recipientRobloxId }).exec();
      if (!recipient) return res.status(404).json({ success: false, message: "Recipient not found" });

      if (sender._id.equals(recipient._id)) {
        return res.status(400).json({ success: false, message: "You cannot tip yourself" });
      }

      if (sender.balance < amount) {
        return res.status(400).json({ success: false, message: "Insufficient balance" });
      }

      // Perform balance updates
      await Account.updateOne({ _id: sender._id }, { $inc: { balance: -amount } }).exec();
      await Account.updateOne({ _id: recipient._id }, { $inc: { balance: amount } }).exec();

      // Notify connected clients
      const payload = {
        from: sender.username,
        fromRobloxId: sender.robloxId,
        to: recipient.username,
        toRobloxId: recipient.robloxId,
        amount,
        item: req.body.item || null,
        time: new Date(),
      };

      emitEvent("TIP", payload);
      emitBalanceUpdate([sender._id, recipient._id]);

      // Send webhook notification (best-effort)
      try {
        const message = `${sender.username} (${sender.robloxId}) tipped ${recipient.username} (${recipient.robloxId}) ${amount} R$${req.body.item ? ` - ${req.body.item}` : ""}`;
        tipHook.send(message);
      } catch (e) {
        console.warn("Tip webhook failed:", e && e.message);
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error in send_tip:", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }),
];
