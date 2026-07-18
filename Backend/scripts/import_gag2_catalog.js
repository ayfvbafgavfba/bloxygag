const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Item = require('../models/item');
const config = require('../config');

(async () => {
  const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('No MongoDB URI configured');
  }

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

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

    const result = await Item.updateOne(query, update, { upsert: true });
    if (result.upsertedCount) created += 1;
    else if (result.modifiedCount) updated += 1;
  }

  console.log(JSON.stringify({ created, updated, total: items.length }));
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
