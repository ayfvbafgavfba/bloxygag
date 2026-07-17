const mongoose = require('mongoose');
const config = require('../config');
const Item = require('../models/item');

async function run() {
  await mongoose.connect(config.MONGODB_URI);
  console.log('Connected to MongoDB');

  // show items with missing or empty item_image
  const missing = await Item.find({ $or: [{ item_image: { $exists: false } }, { item_image: null }, { item_image: '' }] }).limit(50).lean();
  console.log(`Items with missing image (count=${missing.length}):`);
  missing.forEach(i => console.log('-', i.item_name));

  // show items that reference gag2 or github raw
  const gag2 = await Item.find({ item_image: { $regex: 'gag2', $options: 'i' } }).lean();
  console.log(`\nItems referencing gag2 (count=${gag2.length}):`);
  gag2.forEach(i => console.log('-', i.item_name, '->', i.item_image));

  const github = await Item.find({ item_image: { $regex: 'raw.githubusercontent.com', $options: 'i' } }).lean();
  console.log(`\nItems referencing GitHub raw (count=${github.length}):`);
  github.forEach(i => console.log('-', i.item_name, '->', i.item_image));

  await mongoose.disconnect();
  console.log('Disconnected');
}

run().catch(err => { console.error(err); process.exit(1); });
