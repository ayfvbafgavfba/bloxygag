const axios = require("axios");
const Account = require("../models/account");
const InventoryItem = require("../models/inventoryItem");
const GameWithdrawal = require("../models/gameWithdrawal");
const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bloxpvp");

/**
 * Auto Withdraw Script for GAG2
 * Usage: npm run auto-withdraw -- <robloxId> <quantity>
 * Example: npm run auto-withdraw -- 123456 5
 */

async function autoWithdrawItems(robloxId, quantity) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const withdrawQuantity = parseInt(quantity);
    if (isNaN(withdrawQuantity) || withdrawQuantity < 1) {
      throw new Error("Quantity must be a positive number");
    }

    // Find user account
    const userAccount = await Account.findOne({ robloxId }).session(session);
    if (!userAccount) {
      throw new Error(`User with Roblox ID ${robloxId} not found`);
    }

    // Get inventory items (not locked)
    const inventoryItems = await InventoryItem.find({
      owner: userAccount._id,
      locked: false,
      game: "GAG2",
    })
      .populate("item")
      .session(session)
      .limit(withdrawQuantity);

    if (inventoryItems.length === 0) {
      throw new Error("No items available for withdrawal");
    }

    let withdrawnItems = [];
    const actualWithdrawnCount = Math.min(withdrawQuantity, inventoryItems.length);

    // Lock items and create withdrawal records
    for (let i = 0; i < actualWithdrawnCount; i++) {
      const item = inventoryItems[i];

      // Lock the item
      await InventoryItem.findByIdAndUpdate(item._id, { locked: true }, { session });

      // Create withdrawal record
      const newWithdrawal = new GameWithdrawal({
        inventoryItem: item._id,
        item_name: item.item.item_name,
        robloxId: userAccount.robloxId,
        game: "GAG2",
      });
      await newWithdrawal.save({ session });

      withdrawnItems.push(`${item.item.display_name || item.item.item_name}`);
    }

    await session.commitTransaction();

    console.log(`✅ Withdrawal Initiated for ${userAccount.username} (${robloxId})`);
    console.log(`Items queued for withdrawal:`);
    withdrawnItems.forEach((item) => console.log(`  • ${item}`));
    console.log(`Total items: ${withdrawnItems.length}`);

    // Send webhook notification
    try {
      const webhookUrl = process.env.WITHDRAW_WEBHOOK_URL || 
        "https://discord.com/api/webhooks/1525094341150769276/o58Ow9UjSLvUDB4sybVTAHFsO4P9o77Y0PvnsbV0hd5mNkJat5ife3V4gQbTZOiJr1fu";
      
      const webhookMessage = {
        content: `**Auto Withdrawal Request (GAG2)**`,
        embeds: [
          {
            title: `${userAccount.username} (${userAccount.robloxId})`,
            color: 8835959,
            fields: [
              {
                name: "Level",
                value: `${userAccount.level || "N/A"}`,
                inline: true,
              },
              {
                name: "Items",
                value: withdrawnItems.join("\n") || "None",
                inline: false,
              },
            ],
            footer: {
              text: `Script Withdrawal | ID: ${userAccount._id}`,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      await axios.post(webhookUrl, webhookMessage);
      console.log("Discord webhook notification sent");
    } catch (webhookError) {
      console.warn("Failed to send webhook notification:", webhookError.message);
    }

    return { success: true, itemsWithdrawn: withdrawnItems, count: actualWithdrawnCount };
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Withdrawal failed:", error.message);
    throw error;
  } finally {
    session.endSession();
    mongoose.connection.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: npm run auto-withdraw -- <robloxId> <quantity>");
  console.error("Example: npm run auto-withdraw -- 123456 5");
  process.exit(1);
}

const [robloxId, quantity] = args;
autoWithdrawItems(robloxId, quantity).catch((err) => {
  console.error(err);
  process.exit(1);
});
