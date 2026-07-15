const mongoose = require('mongoose');
const Account = require('./models/account');
const Item = require('./models/item');
const InventoryItem = require('./models/inventoryItem');
const config = require('./config');

const username = 'big_AMUNGUS666';
const gemsToAdd = 1000; // change this to the number of gems you want to add
const petNames = ['Golden Huge Cat', 'Titanic'];

async function findOrCreateItem(name, displayName, value) {
  let item = await Item.findOne({ item_name: name });
  if (!item) {
    item = await Item.create({
      item_name: name,
      display_name: displayName,
      item_value: String(value),
      item_image: '',
      game: 'PS99',
    });
    console.log('Created item:', name);
  } else {
    console.log('Item already exists:', name);
  }
  return item;
}

async function main() {
  await mongoose.connect(config.MONGODB_URI);

  const account = await Account.findOne({ username });
  if (!account) {
    console.error('Account not found:', username);
    process.exit(1);
  }

  if (gemsToAdd > 0) {
    await Account.updateOne({ _id: account._id }, { $inc: { balance: gemsToAdd } });
    console.log(`Added ${gemsToAdd} gems to ${username}`);
  }

  for (const petName of petNames) {
    const item = await findOrCreateItem(petName, petName, 10000);
    const existingInventory = await InventoryItem.findOne({ owner: account._id, item: item._id });
    if (existingInventory) {
      console.log(`${username} already owns ${petName}`);
    } else {
      await InventoryItem.create({
        owner: account._id,
        item: item._id,
        locked: false,
        game: 'PS99',
      });
      console.log(`Added ${petName} to ${username}`);
    }
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});