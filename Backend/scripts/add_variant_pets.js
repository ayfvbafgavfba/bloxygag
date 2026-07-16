const mongoose = require('mongoose');
const Item = require('../models/item');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bloxpvp', { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
  try {
    const pets = await Item.find({ game: 'GAG2', item_type: 'pet' }).lean();
    console.log(`Found ${pets.length} GAG2 pets`);

    const variants = ['Big ', 'Huge ', 'Rainbow '];
    let created = 0;

    for (const pet of pets) {
      for (const prefix of variants) {
        const newName = `${prefix}${pet.item_name}`;
        const exists = await Item.findOne({ item_name: newName, game: 'GAG2' }).lean();
        if (exists) continue;

        let multiplier = 1;
        if (prefix === 'Big ') multiplier = 5;
        if (prefix === 'Huge ') multiplier = 20;
        if (prefix === 'Rainbow ') multiplier = 100;

        const newItem = new Item({
          item_name: newName,
          display_name: newName,
          item_value: (Number(pet.item_value || 0) * multiplier) || 0,
          rarity: pet.rarity || 'Legendary',
          game: 'GAG2',
          item_type: pet.item_type || 'pet',
          createdAt: new Date(),
        });

        await newItem.save();
        created++;
        console.log('Created:', newName);
      }
    }

    console.log(`Done. Created ${created} variant items.`);
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
    mongoose.connection.close();
    process.exit(1);
  }
}

run();
