const mongoose = require('mongoose');
const Item = require('../models/item');
const config = require('../config');

// Pet image mapping - using local public PNG files
// Place PNG files in: /Backend/public/images/pets/
const petImageMapping = {
  // Super Rare Pets
  'Raccoon': '/images/pets/raccoon.png',
  'Black Dragon': '/images/pets/blackdragon.png',
  'Ice Serpent': '/images/pets/iceserpent.png',
  
  // Mythic Pets
  'Monkey': '/images/pets/monkey.png',
  'Golden Dragonfly': '/images/pets/goldendragonfly.png',
  'Unicorn': '/images/pets/unicorn.png',
  'Bear': '/images/pets/bear.png',
  'Bald Eagle': '/images/pets/baldeagle.png',
  
  // Legendary Pets
  'Robin': '/images/pets/robin.png',
  'Bee': '/images/pets/bee.png',
  'Butterfly': '/images/pets/butterfly.png',
  'Deer': '/images/pets/deer.png',
  'Turtle': '/images/pets/turtle.png',
  
  // Uncommon & Rare Pets
  'Owl': '/images/pets/owl.png',
  'Frog': '/images/pets/frog.png',
  'Bunny': '/images/pets/bunny.png',
};

async function updatePetImages() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const [petName, imageUrl] of Object.entries(petImageMapping)) {
      const result = await Item.findOneAndUpdate(
        { item_name: petName },
        { item_image: imageUrl },
        { new: true }
      );

      if (result) {
        console.log(`✓ Updated ${petName}`);
        updatedCount++;
      } else {
        console.log(`✗ Pet not found: ${petName}`);
        notFoundCount++;
      }
    }

    console.log(`\n--- Summary ---`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Not found: ${notFoundCount}`);

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

updatePetImages();
