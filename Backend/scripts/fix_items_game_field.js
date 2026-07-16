const mongoose = require("mongoose");
require("dotenv").config();

const Item = require("../models/item");
const { MONGODB_URI } = require("../config");

const mongoDB = MONGODB_URI || "mongodb://127.0.0.1:27017/bloxpvp";

async function fixItems() {
  try {
    await mongoose.connect(mongoDB);
    console.log("Connected to MongoDB");

    console.log("\nUpdating items with game field...");
    const result = await Item.updateMany(
      { game: { $exists: false } },
      { $set: { game: "GAG2" } }
    );
    
    console.log(`✓ Updated ${result.modifiedCount} items`);

    const items = await Item.find().sort({ item_name: 1 });
    console.log(`\nTotal items in database: ${items.length}`);
    console.log("\nItems:");
    items.forEach(item => {
      console.log(`  - ${item.item_name} (${item.item_value})`);
    });

    console.log("\n✅ All items fixed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

fixItems();
