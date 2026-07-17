const mongoose = require('mongoose');
const path = require('path');
const config = require('../config');
const Item = require('../models/item');

const mapping = {
  Raccoon: 'https://cdn.gag2.gg/items/big_raccoon.webp',
  'Black Dragon': 'https://cdn.gag2.gg/items/black_dragon.webp',
  'Ice Serpent': 'https://cdn.gag2.gg/items/ice_serpent.webp',
  Monkey: 'https://cdn.gag2.gg/items/monkey_rainbow.webp',
  'Golden Dragonfly': 'https://cdn.gag2.gg/items/big_firefly.webp',
  Unicorn: 'https://cdn.gag2.gg/items/unicorn_rainbow.webp',
  Bear: 'https://cdn.gag2.gg/items/bear_rainbow.webp',
  'Bald Eagle': 'https://cdn.gag2.gg/items/big_bald_eagle.webp',
  "Dragon's Breath": 'https://cdn.gag2.gg/items/dragon_s_breath.webp',
  'Hypno Bloom': 'https://cdn.gag2.gg/items/hypno_bloom.webp',
  'Moon Bloom': 'https://cdn.gag2.gg/items/moon_bloom.webp',
  'Ghost Pepper': 'https://cdn.gag2.gg/items/ghost_pepper.webp',
  Pomegranate: 'https://cdn.gag2.gg/items/pomegranate.webp',
  'Venom Spitter': 'https://cdn.gag2.gg/items/venom_spitter.webp',
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

(async () => {
  await mongoose.connect(config.MONGODB_URI);
  console.log('Connected to MongoDB');

  let updated = 0;
  let missing = 0;

  for (const [name, imageUrl] of Object.entries(mapping)) {
    const query = { item_name: new RegExp(`^${escapeRegex(name)}$`, 'i') };
    const item = await Item.findOne(query);

    if (!item) {
      missing += 1;
      console.log(`Missing item: ${name}`);
      continue;
    }

    if (item.item_image === imageUrl) {
      console.log(`Already set: ${name}`);
      continue;
    }

    item.item_image = imageUrl;
    await item.save();
    updated += 1;
    console.log(`Updated ${name} -> ${imageUrl}`);
  }

  console.log(`\nSummary: updated=${updated}, missing=${missing}`);
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
