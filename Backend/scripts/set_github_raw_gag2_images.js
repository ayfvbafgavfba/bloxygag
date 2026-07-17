const mongoose = require('mongoose');
const config = require('../config');
const Item = require('../models/item');

// Adjust these if your repo/branch differ
const GITHUB_OWNER = 'ayfvbafgavfba';
const GITHUB_REPO = 'bloxygag';
const GITHUB_BRANCH = 'main';

const base = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/Frontend/public/images/gag2`;

const mapping = {
  Raccoon: `${base}/big_raccoon.webp`,
  'Black Dragon': `${base}/black_dragon.webp`,
  'Ice Serpent': `${base}/ice_serpent.webp`,
  Monkey: `${base}/monkey_rainbow.webp`,
  'Golden Dragonfly': `${base}/big_firefly.webp`,
  Unicorn: `${base}/unicorn_rainbow.webp`,
  Bear: `${base}/bear_rainbow.webp`,
  'Bald Eagle': `${base}/big_bald_eagle.webp`,
  "Dragon's Breath": `${base}/dragon_s_breath.webp`,
  'Hypno Bloom': `${base}/hypno_bloom.webp`,
  'Moon Bloom': `${base}/moon_bloom.webp`,
  'Ghost Pepper': `${base}/ghost_pepper.webp`,
  Pomegranate: `${base}/pomegranate.webp`,
  'Venom Spitter': `${base}/venom_spitter.webp`,
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

(async () => {
  await mongoose.connect(config.MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const [name, imageUrl] of Object.entries(mapping)) {
    const query = { item_name: new RegExp(`^${escapeRegex(name)}$`, 'i') };
    const item = await Item.findOne(query);
    if (!item) {
      console.log(`Missing item: ${name}`);
      continue;
    }
    item.item_image = imageUrl;
    await item.save();
    console.log(`Updated ${name} -> ${imageUrl}`);
  }

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
