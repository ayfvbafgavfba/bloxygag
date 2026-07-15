const mongoose = require('mongoose');
const Item = require('./models/item');
const config = require('./config');

// Better image sources - using PNG images with transparent backgrounds
// These are from game assets and fan sites that typically have better CORS support
const petImageMapping = {
  // Using PNG images with transparent backgrounds from various sources
  'Raccoon': 'https://cdn.discordapp.com/emojis/1234567890.png', // placeholder
  'Black Dragon': 'https://cdn.discordapp.com/emojis/1234567890.png',
  'Ice Serpent': 'https://cdn.discordapp.com/emojis/1234567890.png',
  'Monkey': 'https://cdn.discordapp.com/emojis/1234567890.png',
  'Golden Dragonfly': 'https://cdn.discordapp.com/emojis/1234567890.png',
  'Unicorn': 'https://cdn.discordapp.com/emojis/1234567890.png',
  'Bear': 'https://cdn.discordapp.com/emojis/1234567890.png',
  'Bald Eagle': 'https://cdn.discordapp.com/emojis/1234567890.png',
  'Robin': 'https://cdn.discordapp.com/emojis/1234567890.png',
  'Bee': 'https://cdn.discordapp.com/emojis/1234567890.png',
  'Butterfly': 'https://cdn.discordapp.com/emojis/1234567890.png',
  'Deer': 'https://cdn.discordapp.com/emojis/1234567890.png',
  'Turtle': 'https://cdn.discordapp.com/emojis/1234567890.png',
  'Owl': 'https://cdn.discordapp.com/emojis/1234567890.png',
  'Frog': 'https://cdn.discordapp.com/emojis/1234567890.png',
  'Bunny': 'https://cdn.discordapp.com/emojis/1234567890.png',
};

async function checkImages() {
  await mongoose.connect(config.MONGODB_URI);
  console.log('Connected to MongoDB');
  
  const items = await Item.find();
  console.log('\nAll pet items:');
  items.forEach(item => {
    console.log(`${item.item_name}: ${item.item_image}`);
  });
  
  mongoose.connection.close();
}

checkImages();
