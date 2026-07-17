const mongoose = require('mongoose');
const config = require('../config');
const Item = require('../models/item');

(async () => {
  await mongoose.connect(config.MONGODB_URI);
  console.log('Connected to MongoDB');

  const fallback = 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/big_raccoon.webp';
  const names = ['Huge Cat', 'Golden Huge Cat'];

  for (const name of names) {
    const item = await Item.findOne({ item_name: new RegExp(`^${name}$`, 'i') });
    if (!item) {
      console.log('Not found:', name);
      continue;
    }
    item.item_image = fallback;
    await item.save();
    console.log('Updated', name, '->', fallback);
  }

  await mongoose.disconnect();
  console.log('Disconnected');
})();
