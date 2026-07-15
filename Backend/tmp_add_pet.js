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

  const itemName = 'Golden Huge Cat';
  let item = await Item.findOne({ item_name: itemName });
  if (!item) {
    item = await Item.create({
      item_name: itemName,
      display_name: 'Golden Huge Cat',
      item_value: '10000',
      item_image: '',
      game: 'PS99',
    });
    console.log('Created item:', itemName);
  } else {
    console.log('Item already exists:', itemName);
  }

  const existingInventory = await InventoryItem.findOne({ owner: account._id, item: item._id });
  if (existingInventory) {
    console.log('User already owns this pet:', itemName);
  } else {
    await InventoryItem.create({
      owner: account._id,
      item: item._id,
      locked: false,
      game: 'PS99',
    });
    console.log('Added pet to account:', account.username);
  }

  await mongoose.disconnect();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});