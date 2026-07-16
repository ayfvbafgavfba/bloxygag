const mongoose = require("mongoose");
require("dotenv").config();

const Item = require("../models/item");
const { MONGODB_URI } = require("../config");

const mongoDB = MONGODB_URI || "mongodb://127.0.0.1:27017/bloxpvp";

const bigPets = [
  { name: "Big Dragon Fly", value: 240000 },
  { name: "Big Black Dragon", value: 6000000 },
  { name: "Big Ice serpent", value: 3500000 },
  { name: "Big Monkey", value: 70000 },
  { name: "Big Bear", value: 82000 },
  { name: "Big Bald Eagle", value: 36000 },
  { name: "big bunny", value: 15000 },
  { name: "big frog", value: 12000 },
  { name: "big dear", value: 17000 },
  { name: "big unicorn", value: 800000 },
  { name: "big raccon", value: 2500000 },
];

async function addBigPets() {
  try {
    await mongoose.connect(mongoDB);
    console.log("Connected to MongoDB");

    console.log("\nAdding big pets...");
    for (const pet of bigPets) {
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

    console.log("\n✅ All big pets added successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

addBigPets();
