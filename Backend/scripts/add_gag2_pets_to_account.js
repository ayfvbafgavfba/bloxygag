const mongoose = require('mongoose');
const config = require('../config');
const Account = require('../models/account');
const Item = require('../models/item');
const InventoryItem = require('../models/inventoryItem');

async function main() {
  await mongoose.connect(config.MONGODB_URI);

  const username = 'big_AMUNGUS666';
  const account = await Account.findOne({ username });
  if (!account) {
    console.error(`Account not found: ${username}`);
    process.exit(1);
  }

  console.log(`Updating inventory for ${account.username} (${account._id})`);

  // Remove Huge Cat inventory entries for this account
  const hugeCatItems = await Item.find({
    item_name: { $regex: /Huge Cat/i },
  });

  if (hugeCatItems.length > 0) {
    const deleteResult = await InventoryItem.deleteMany({
      owner: account._id,
      item: { $in: hugeCatItems.map((item) => item._id) },
    });
    console.log(`Removed ${deleteResult.deletedCount} Huge Cat inventory item(s)`);
  } else {
    console.log('No Huge Cat items found in the item catalog');
  }

  // Add one of each GAG2 pet to the account inventory
  const petNames = [
    'Frog', 'Bunny', 'Owl', 'Deer', 'Turtle', 'Robin', 'Bee', 'Butterfly',
    'Monkey', 'Golden Dragonfly', 'Unicorn', 'Bear', 'Bald Eagle', 'Raccoon',
    'Black Dragon', 'Ice Serpent'
  ];

  let addedCount = 0;
  for (const petName of petNames) {
    const pet = await Item.findOne({ game: 'GAG2', item_name: petName });
    if (!pet) {
      console.log(`Pet not found in catalog: ${petName}`);
      continue;
    }

    const existing = await InventoryItem.findOne({
      owner: account._id,
      item: pet._id,
    });

    if (!existing) {
      await InventoryItem.create({
        owner: account._id,
        item: pet._id,
        locked: false,
        game: 'GAG2',
      });
      addedCount += 1;
      console.log(`Added: ${pet.item_name}`);
    }
  }

  console.log(`Added ${addedCount} new GAG2 pet item(s) to ${username}'s inventory`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
