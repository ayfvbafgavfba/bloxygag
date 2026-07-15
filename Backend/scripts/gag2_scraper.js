const axios = require("axios");
const Item = require("../models/item");
const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bloxpvp");

const gag2Items = {
  pets: [
    { name: "Raccoon", rarity: "Super", game: "GAG2", type: "pet", value: 140000 },
    { name: "Black Dragon", rarity: "Super", game: "GAG2", type: "pet", value: 5000000 },
    { name: "Ice Serpent", rarity: "Super", game: "GAG2", type: "pet", value: 2500000 },
    { name: "Monkey", rarity: "Mythic", game: "GAG2", type: "pet", value: 1500 },
    { name: "Golden Dragonfly", rarity: "Mythic", game: "GAG2", type: "pet", value: 3000 },
    { name: "Unicorn", rarity: "Mythic", game: "GAG2", type: "pet", value: 5000 },
    { name: "Bear", rarity: "Mythic", game: "GAG2", type: "pet", value: 2000 },
    { name: "Bald Eagle", rarity: "Mythic", game: "GAG2", type: "pet", value: 1000 },
  ],
  seeds: [
    { name: "Dragon's Breath", rarity: "Super", game: "GAG2", type: "seed", value: 18000 },
    { name: "Hypno Bloom", rarity: "Super", game: "GAG2", type: "seed", value: 10000 },
    { name: "Moon Bloom", rarity: "Super", game: "GAG2", type: "seed", value: 9000 },
    { name: "Ghost Pepper", rarity: "Mythic", game: "GAG2", type: "seed", value: 12000 },
    { name: "Pomegranate", rarity: "Mythic", game: "GAG2", type: "seed", value: 1000 },
    { name: "Venom Spitter", rarity: "Mythic", game: "GAG2", type: "seed", value: 2000 },
  ],
};

async function importGAG2Items() {
  try {
    console.log("Starting GAG2 items import...");
    
    // Delete existing GAG2 items
    await Item.deleteMany({ game: "GAG2" });
    console.log("Cleared existing GAG2 items");

    // Rarity value mapping (you can adjust these)
    const rarityValues = {
      Common: 1000,
      Uncommon: 5000,
      Rare: 10000,
      Epic: 25000,
      Legendary: 50000,
      Mythic: 100000,
      Super: 250000,
    };

    const allItems = [...gag2Items.pets, ...gag2Items.seeds];
    const itemsToInsert = allItems.map((item) => ({
      item_name: item.name,
      display_name: item.name,
      item_value: item.value !== undefined ? item.value : rarityValues[item.rarity] || 0,
      rarity: item.rarity,
      game: item.game,
      item_type: item.type,
      createdAt: new Date(),
    }));

    const result = await Item.insertMany(itemsToInsert);
    console.log(`Successfully imported ${result.length} GAG2 items!`);
    console.log(`Pets: ${gag2Items.pets.length}, Seeds: ${gag2Items.seeds.length}`);

    mongoose.connection.close();
  } catch (error) {
    console.error("Error importing GAG2 items:", error);
    mongoose.connection.close();
    process.exit(1);
  }
}

importGAG2Items();
