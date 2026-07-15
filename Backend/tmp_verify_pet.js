const mongoose = require('mongoose');
const Account = require('./models/account');
const Item = require('./models/item');
const InventoryItem = require('./models/inventoryItem');
const config = require('./config');

async function main() {
  await mongoose.connect(config.MONGODB_URI);
  const account = await Account.findOne({ username: 'big_AMUNGUS666' });
  if (!account) {
    console.error('Account not found');
    process.exit(1);
  }
  const inventory = await InventoryItem.find({ owner: account._id }).populate('item').lean();
  console.log('Inventory count:', inventory.length);
  inventory.forEach(i => {
    console.log(i.item.item_name, '|', i.item.display_name, '|', i.game, '|', i.locked);
  });
  await mongoose.disconnect();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});