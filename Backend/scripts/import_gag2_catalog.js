const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Item = require('../models/item');
const config = require('../config');

async function importGag2Catalog({ mongoUri = process.env.MONGODB_URI || config.MONGODB_URI, itemModel = Item, connection = mongoose, logger = console } = {}) {
  if (!mongoUri) {
    throw new Error('No MongoDB URI configured');
  }

  if (connection.connection?.readyState !== 1) {
    await connection.connect(mongoUri);
  }

  const filePath = path.join(__dirname, '..', 'data', 'gag2_pet_values_import.json');
  const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let created = 0;
  let updated = 0;

  for (const entry of items) {
    const query = { item_name: entry.name, game: entry.game || 'GAG2' };
    const update = {
      $set: {
        item_name: entry.name,
        display_name: entry.display_name || entry.name,
        item_value: String(entry.item_value || 0),
        game: entry.game || 'GAG2',
        item_type: entry.item_type || 'pet',
      },
    };

    const result = await itemModel.updateOne(query, update, { upsert: true });
    if (result.upsertedCount) created += 1;
    else if (result.modifiedCount) updated += 1;
  }

  const summary = { created, updated, total: items.length };
  logger.log(`[gag2-seed] ${JSON.stringify(summary)}`);
  return summary;
}

if (require.main === module) {
  importGag2Catalog()
    .then(async (summary) => {
      if (mongoose.connection?.readyState === 1) {
        await mongoose.disconnect();
      }
      console.log(JSON.stringify(summary));
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { importGag2Catalog };
