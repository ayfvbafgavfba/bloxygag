const mongoose = require('mongoose');
const Item = require('../models/item');
const config = require('../config');

const getImageForPetName = (petName) => {
  const name = String(petName || '').trim().toLowerCase();
  if (name.includes('unicorn')) return '/images/pets/unicorn.png';
  if (name.includes('raccoon')) return '/images/pets/raccoon.png';
  return null;
};

async function updatePetImages() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    const pets = await Item.find({
      $or: [
        { item_name: { $regex: /unicorn/i } },
        { item_name: { $regex: /raccoon/i } },
      ],
    });

    let updatedCount = 0;
    let unchangedCount = 0;

    for (const pet of pets) {
      const imageUrl = getImageForPetName(pet.item_name);
      if (!imageUrl) continue;

      if (pet.item_image !== imageUrl) {
        pet.item_image = imageUrl;
        await pet.save();
        console.log(`✓ Updated ${pet.item_name} -> ${imageUrl}`);
        updatedCount++;
      } else {
        unchangedCount++;
      }
    }

    console.log(`\n--- Summary ---`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Already correct: ${unchangedCount}`);

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

updatePetImages();
