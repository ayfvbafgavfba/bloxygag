#!/usr/bin/env node
/*
 * import_items_from_file.js
 * Usage: node import_items_from_file.js /path/to/items.json
 * JSON format: array of objects with fields:
 *   - name (required)
 *   - display_name (optional)
 *   - item_type (optional, default: 'pet' or 'seed')
 *   - item_value (optional, default: 0)
 *   - game (optional, default: 'GAG2')
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Item = require('../models/item');
const config = require('../config');

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node import_items_from_file.js /path/to/items.json');
    process.exit(1);
  }

  const full = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  if (!fs.existsSync(full)) {
    console.error('File not found:', full);
    process.exit(1);
  }

  const raw = fs.readFileSync(full, 'utf8');
  let items;
  try {
    items = JSON.parse(raw);
  } catch (err) {
    console.error('Invalid JSON:', err.message);
    process.exit(1);
  }
  if (!Array.isArray(items)) {
    console.error('JSON must be an array of item objects');
    process.exit(1);
  }

  const mongo = process.env.MONGODB_URI || config.MONGODB_URI;
  if (!mongo) {
    console.error('MONGODB_URI not set in env or config');
    process.exit(1);
  }

  await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to', mongo);

  let created = 0;
  let updated = 0;

  for (const it of items) {
    const name = (it.name || it.item_name || it.itemName || '').toString().trim();
    if (!name) continue;
    const game = (it.game || 'GAG2').toString();
    const display_name = it.display_name || it.displayName || name;
    const lower = name.toLowerCase();
    const item_type = it.item_type || it.type || (lower.endsWith(' seed') ? 'seed' : 'pet');
    const item_value = it.item_value != null ? String(it.item_value) : '0';

    try {
      const res = await Item.updateOne(
        { item_name: name, game },
        {
          $set: {
            item_name: name,
            display_name,
            item_value,
            game,
            item_type,
          },
        },
        { upsert: true }
      ).exec();

      if (res.upserted) created += 1;
      else if (res.nModified || res.modifiedCount) updated += 1;
    } catch (err) {
      console.error('Failed to upsert', name, err && err.message);
    }
  }

  console.log(`Imported items - created: ${created}, updated: ${updated}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
