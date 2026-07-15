const axios = require("axios");
const Account = require("../models/account");
const Item = require("../models/item");
const InventoryItem = require("../models/inventoryItem");
const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bloxpvp");

/**
 * Auto Deposit Script for GAG2
 * Usage: npm run auto-deposit -- <robloxId> <item1,item2,item3> <quantities>
 * Example: npm run auto-deposit -- 123456 "Frog,Apple,Fire Fern" "1,5,3"
 */

async function autoDepositItems(robloxId, itemNames, quantities) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find user account
    const userAccount = await Account.findOne({ robloxId }).session(session);
    if (!userAccount) {
      throw new Error(`User with Roblox ID ${robloxId} not found`);
    }

    const itemArray = itemNames.split(",").map((item) => item.trim());
    const quantityArray = quantities.split(",").map((qty) => parseInt(qty.trim()));

    if (itemArray.length !== quantityArray.length) {
      throw new Error("Item names and quantities must match in length");
    }

    let depositedItems = [];
    let totalValue = 0;

    // Process each item
    for (let i = 0; i < itemArray.length; i++) {
      const itemName = itemArray[i];
      const quantity = quantityArray[i];

      // Find item in database
      const item = await Item.findOne({ item_name: itemName, game: "GAG2" }).session(session);
      if (!item) {
        console.warn(`Item "${itemName}" not found, skipping...`);
        continue;
      }

      // Create inventory items
      for (let j = 0; j < quantity; j++) {
        const newInventoryItem = new InventoryItem({
          item: item._id,
          owner: userAccount._id,
          locked: false,
          game: "GAG2",
        });
        await newInventoryItem.save({ session });
        depositedItems.push(itemName);
        totalValue += item.item_value;
      }
    }

    // Update account balance
    await Account.findByIdAndUpdate(
      userAccount._id,
      {
        $inc: { deposited: totalValue },
      },
      { session }
    );

    await session.commitTransaction();

    console.log(`✅ Deposit Successful for ${userAccount.username} (${robloxId})`);
    console.log(`Items deposited: ${depositedItems.join(", ")}`);
    console.log(`Total value: Sheckle ${totalValue}`);

    return { success: true, itemsDeposited: depositedItems, totalValue };
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Deposit failed:", error.message);
    throw error;
  } finally {
    session.endSession();
    mongoose.connection.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error("Usage: npm run auto-deposit -- <robloxId> <items> <quantities>");
  console.error("Example: npm run auto-deposit -- 123456 'Frog,Apple,Fire Fern' '1,5,3'");
  process.exit(1);
}

const [robloxId, itemNames, quantities] = args;
autoDepositItems(robloxId, itemNames, quantities).catch((err) => {
  console.error(err);
  process.exit(1);
});
