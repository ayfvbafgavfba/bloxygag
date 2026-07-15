const asyncHandler = require("express-async-handler");
const Account = require("../../models/account");
const InventoryItem = require("../../models/inventoryItem");
const Item = require("../../models/item");
const { Webhook } = require("discord-webhook-node");

const depositHook = new Webhook(
  process.env.DEPOSIT_WEBHOOK_URL || "https://discord.com/api/webhooks/1225823548329951312/u5yhbXFpEW5ZfPrtUsm6DYtLn1DGwfniHAazaQa0rSy-dZUtlhw4HpiuU5Oy0i93ylhI"
);

depositHook.setUsername("BLOXPVP - Lua Deposits");
depositHook.setAvatar(
  "https://s3-alpha-sig.figma.com/img/2b34/f172/b5c4249c2ed513c73212e742814f4b54?Expires=1711324800&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4&Signature=Vpjq2og4gzlTx9nsXfXmBo9FYg3ZkHzKSVKf5gejUHqvUUSJLQpFaYLYowTYFB~gJ32aPnVwnrwP~oqKz2gmcrfjBleISf2gdDhXRdHWAc~mDfU33sf3Y6fKYww1pfkEjC17RAWHV60TUwmjauNfPG1-6jTOjYYwUO-X4nS7Dz1tr9OWjDYe2jAccfV4mApd83RFYASsJbnDNqbd7BCfAbiFR8VKe2jmsSBavksA~cBSWpNb4W4f7Udw7GzRgTTyjSodO3XFDxOiuYbsNHc-cTFa~7AIei7bYzibtLXQM09NXZBKhirk6jUhqb9tHvTiwF37jYYXepZemEmnTyz7qw__"
);

/**
 * Lua Deposit API Endpoint
 * Accepts deposits from the Roblox Lua deposit bot
 * 
 * Expected payload:
 * {
 *   roblox_id: string (user's Roblox ID),
 *   pets: array of strings (pet names like "Golden Hugesword", "✨ Rainbow Dragon"),
 *   gems: number (amount of gems deposited)
 * }
 */
exports.lua_deposit = asyncHandler(async (req, res) => {
  try {
    const { roblox_id, pets, gems } = req.body;

    // Validate required fields
    if (!roblox_id) {
      return res.status(400).json({
        success: false,
        message: "Missing roblox_id",
      });
    }

    // Find account by Roblox ID
    const account = await Account.findOne({ robloxId: roblox_id });
    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    let depositedPets = [];
    let failedPets = [];
    let totalValue = 0;

    // Process each pet if provided
    if (pets && Array.isArray(pets)) {
      for (const petName of pets) {
        // Clean up pet name: remove emojis/formatting
        const cleanPetName = petName
          .replace(/^✨\s*/, "") // remove shine emoji
          .replace(/^Golden\s+/, "") // remove "Golden" prefix
          .replace(/^Rainbow\s+/, "") // remove "Rainbow" prefix
          .trim();

        // Try to find the item in the database
        const item = await Item.findOne({
          item_name: { $regex: cleanPetName, $options: "i" },
        });

        if (item) {
          // Create inventory item
          const inventoryItem = new InventoryItem({
            item: item._id,
            owner: account._id,
            locked: false,
            game: "PS99",
          });

          await inventoryItem.save();

          // Update account's deposited amount (5% of item value as in-game currency)
          const depositValue = (Number(item.item_value) / 1000) * 5;
          await Account.updateOne(
            { _id: account._id },
            {
              $inc: { deposited: depositValue },
            }
          );

          depositedPets.push(petName);
          totalValue += depositValue;
        } else {
          failedPets.push(petName);
        }
      }
    }

    // Process gems if provided
    let gemsCredit = 0;
    if (gems && gems > 0) {
      // Add gems to account balance (1 gem = 1 currency unit typically)
      const gemValue = gems / 1000; // Adjust ratio as needed
      await Account.updateOne(
        { _id: account._id },
        {
          $inc: { balance: gemValue },
        }
      );
      gemsCredit = gemValue;
    }

    // Log deposit to Discord
    const summary = [
      `**User:** ${account.username} (${roblox_id})`,
      `**Pets Deposited:** ${depositedPets.length}`,
      depositedPets.length > 0 ? `${depositedPets.join(", ")}` : "_None_",
      `**Gems Deposited:** ${gems || 0}`,
      `**Total Value:** ${(totalValue + gemsCredit).toFixed(2)}`,
    ];

    if (failedPets.length > 0) {
      summary.push(`**Failed Pets:** ${failedPets.join(", ")}`);
    }

    depositHook.send(summary.join("\n"));

    return res.status(200).json({
      success: true,
      message: "Deposit processed successfully",
      deposited: {
        pets: depositedPets.length,
        gems: gemsCredit,
        totalValue: totalValue + gemsCredit,
      },
      failed: failedPets,
    });
  } catch (error) {
    console.error("Lua deposit error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});
