const mongoose = require('mongoose');
const Account = require('./models/account');
const Item = require('./models/item');
const InventoryItem = require('./models/inventoryItem');
const config = require('./config');

async function main() {
  await mongoose.connect(config.MONGODB_URI);

  const username = 'big_AMUNGUS666';
  const account = await Account.findOne({ username });
  if (!account) {
    console.error('Account not found:', username);
    process.exit(1);
  }

  const itemName = 'Huge Cat';
  let item = await Item.findOne({ item_name: itemName });
  if (!item) {
    item = await Item.create({
      item_name: itemName,
      display_name: itemName,
      item_value: '10000',
      item_image: '',
      game: 'PS99',
    });
    console.log('Created item:', itemName);
  }

  for (let i = 0; i < 4; i += 1) {
    await InventoryItem.create({
      owner: account._id,
      item: item._id,
      locked: false,
      game: 'PS99',
    });
    console.log(`Added Huge Cat ${i + 1}/4 to ${username}`);
  }

  await mongoose.disconnect();
  console.log('Done adding 4 Huge Cats to', username);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});