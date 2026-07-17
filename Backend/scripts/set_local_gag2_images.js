const mongoose = require('mongoose');
const config = require('../config');
const Item = require('../models/item');

const mapping = {
  Raccoon: '/images/gag2/big_raccoon.webp',
  'Black Dragon': '/images/gag2/black_dragon.webp',
  'Ice Serpent': '/images/gag2/ice_serpent.webp',
  Monkey: '/images/gag2/monkey_rainbow.webp',
  'Golden Dragonfly': '/images/gag2/big_firefly.webp',
  Unicorn: '/images/gag2/unicorn_rainbow.webp',
  Bear: '/images/gag2/bear_rainbow.webp',
  'Bald Eagle': '/images/gag2/big_bald_eagle.webp',
  "Dragon's Breath": '/images/gag2/dragon_s_breath.webp',
  'Hypno Bloom': '/images/gag2/hypno_bloom.webp',
  'Moon Bloom': '/images/gag2/moon_bloom.webp',
  'Ghost Pepper': '/images/gag2/ghost_pepper.webp',
  Pomegranate: '/images/gag2/pomegranate.webp',
  'Venom Spitter': '/images/gag2/venom_spitter.webp',
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

(async () => {
  await mongoose.connect(config.MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const [name, imagePath] of Object.entries(mapping)) {
    const query = { item_name: new RegExp(`^${escapeRegex(name)}$`, 'i') };
    const item = await Item.findOne(query);
    if (!item) {
      console.log(`Missing item: ${name}`);
      continue;
    }
    item.item_image = imagePath;
    await item.save();
    console.log(`Updated ${name} -> ${imagePath}`);
  }

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
