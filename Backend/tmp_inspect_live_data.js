const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const Account = require('./models/account');
const InventoryItem = require('./models/inventoryItem');
const Item = require('./models/item');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const accounts = await Account.find({}).select('username balance robloxId rank').lean();
  console.log('accounts', JSON.stringify(accounts.slice(0, 10), null, 2));

  const inventoryCount = await InventoryItem.countDocuments();
  console.log('inventoryCount', inventoryCount);

  const pets = await Item.find({
    $or: [{ item_name: { $regex: /unicorn/i } }, { item_name: { $regex: /raccoon/i } }],
  }).select('item_name item_image').lean();
  console.log('pet records', JSON.stringify(pets, null, 2));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
