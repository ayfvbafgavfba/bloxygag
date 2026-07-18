#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('../models/item');
const config = require('../config');

const pets = [
  { name: 'Phoenix', displayName: 'Phoenix', value: 1200000 },
  { name: 'Shadow Wolf', displayName: 'Shadow Wolf', value: 900000 },
  { name: 'Crystal Dragon', displayName: 'Crystal Dragon', value: 1500000 },
  { name: 'Frost Fox', displayName: 'Frost Fox', value: 700000 },
  { name: 'Neon Turtle', displayName: 'Neon Turtle', value: 600000 },
  { name: 'Golden Manta Ray', displayName: 'Golden Manta Ray', value: 1800000 },
  { name: 'Volcanic Cat', displayName: 'Volcanic Cat', value: 850000 },
  { name: 'Space Bunny', displayName: 'Space Bunny', value: 650000 },
  { name: 'Magma Slime', displayName: 'Magma Slime', value: 720000 },
  { name: 'Royal Pegasus', displayName: 'Royal Pegasus', value: 1400000 },
  { name: 'Cyber Falcon', displayName: 'Cyber Falcon', value: 880000 },
  { name: 'Moonlight Owl', displayName: 'Moonlight Owl', value: 750000 },
  { name: 'Sunken Kraken', displayName: 'Sunken Kraken', value: 1600000 },
  { name: 'Candy Dragon', displayName: 'Candy Dragon', value: 1100000 },
  { name: 'Storm Serpent', displayName: 'Storm Serpent', value: 1300000 },
];

async function main() {
  const mongo = process.env.MONGODB_URI || config.MONGODB_URI;
  if (!mongo) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to', mongo);

  let created = 0;
  let updated = 0;

  for (const pet of pets) {
    const query = { item_name: pet.name, game: 'GAG2' };
    const update = {
      $set: {
        item_name: pet.name,
        display_name: pet.displayName,
        item_value: String(pet.value),
        game: 'GAG2',
        item_type: 'pet',
      },
    };
    const res = await Item.updateOne(query, update, { upsert: true });
    if (res.upsertedCount) created += 1;
    else if (res.modifiedCount) updated += 1;
  }

  console.log(`Seeded pets - created: ${created}, updated: ${updated}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
