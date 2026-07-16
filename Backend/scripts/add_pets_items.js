const mongoose = require("mongoose");
require("dotenv").config();

const Item = require("../models/item");
const { MONGODB_URI } = require("../config");

const mongoDB = MONGODB_URI || "mongodb://127.0.0.1:27017/bloxpvp";

const plants = [
  { name: "Dragon's Breath", value: 18000 },
  { name: "Hypno Bloom", value: 10000 },
  { name: "Moon Bloom", value: 9000 },
  { name: "Ghost Pepper", value: 12000 },
  { name: "Pomegranate", value: 1000 },
  { name: "Venom Spitter", value: 2000 },
];

const pets = [
  { name: "Raccoon", value: 140000 },
  { name: "Black Dragon", value: 5000000 },
  { name: "Ice Serpent", value: 2500000 },
  { name: "Monkey", value: 1500 },
  { name: "Golden Dragonfly", value: 3000 },
  { name: "Unicorn", value: 5000 },
  { name: "Bear", value: 2000 },
  { name: "Bald Eagle", value: 1000 },
];

async function addItems() {
  try {
    await mongoose.connect(mongoDB);
    console.log("Connected to MongoDB");

    // Add plants
    console.log("\nAdding plants...");
    for (const plant of plants) {
      const existingItem = await Item.findOne({ item_name: plant.name });
      if (existingItem) {
        console.log(`✓ ${plant.name} already exists (${plant.value})`);
      } else {
        await Item.create({
          item_name: plant.name,
          item_value: plant.value,
          item_type: "Plant",
          item_image: "",
          robloxAssetId: "",
        });
        console.log(`✓ Added ${plant.name} (${plant.value})`);
      }
    }

    // Add pets
    console.log("\nAdding pets...");
    for (const pet of pets) {
      const existingItem = await Item.findOne({ item_name: pet.name });
      if (existingItem) {
        console.log(`✓ ${pet.name} already exists (${pet.value})`);
      } else {
        await Item.create({
          item_name: pet.name,
          item_value: pet.value,
          item_type: "Pet",
          item_image: "",
          robloxAssetId: "",
        });
        console.log(`✓ Added ${pet.name} (${pet.value})`);
      }
    }

    console.log("\n✅ All items added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

addItems();
