const mongoose = require('mongoose');
const Item = require('./models/item');
const config = require('./config');

async function main() {
  await mongoose.connect(config.MONGODB_URI);
  const items = await Item.find({}).limit(100).lean();
  console.log('total:', items.length);
  items.forEach(i => console.log(i.item_name, '|', i.game, '|', i.item_value));
  await mongoose.disconnect();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});