const mongoose = require("mongoose");
require("dotenv").config();

const Item = require("../models/item");
const { MONGODB_URI } = require("../config");

const mongoDB = MONGODB_URI || "mongodb://127.0.0.1:27017/bloxpvp";

const rainbowPets = [
  { name: "Rainbow Raccoon", value: 3000000 },
  { name: "Rainbow Black Dragon", value: 6500000 },
  { name: "Rainbow Ice Serpent", value: 4500000 },
  { name: "Rainbow Monkey", value: 50000 },
  { name: "Rainbow Golden Dragonfly", value: 110000 },
  { name: "Rainbow Unicorn", value: 1500000 },
  { name: "Rainbow Bear", value: 56000 },
  { name: "Rainbow Bald Eagle", value: 24000 },
];

async function addRainbowPets() {
  try {
    await mongoose.connect(mongoDB);
    console.log("Connected to MongoDB");

    console.log("\nAdding rainbow pets...");
    for (const pet of rainbowPets) {
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

    console.log("\n✅ All rainbow pets added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

addRainbowPets();
