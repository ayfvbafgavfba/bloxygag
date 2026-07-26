const mongoose = require('mongoose');
const Account = require('../models/account');
const InventoryItem = require('../models/inventoryItem');
const config = require('../config');

async function resetAllPlayerData() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('Connected to MongoDB');

    const accounts = await Account.find({});
    let resetAccounts = 0;

    for (const account of accounts) {
      account.balance = 0;
      account.deposited = 0;
      account.withdrawn = 0;
      account.wagered = 0;
      account.totalBets = 0;
      account.gameWins = 0;
      account.affiliate = {
        wagered: 0,
        totalEarnings: 0,
        balance: 0,
        referrals: [],
      };
      account.diceClientSeed = null;
      account.limboClientSeed = null;
      account.minesClientSeed = null;
      account.blackjackClientSeed = null;
      account.diceServerSeed = null;
      account.limboServerSeed = null;
      account.minesServerSeed = null;
      account.blackjackServerSeed = null;
      account.diceNonce = 0;
      account.limboNonce = 0;
      account.minesNonce = 0;
      account.blackjackNonce = 0;
      account.diceHistory = [];
      account.limboHistory = [];
      account.minesHistory = [];
      account.blackjackHistory = [];
      await account.save();
      resetAccounts++;
    }

    const inventoryDeleted = await InventoryItem.deleteMany({});
    console.log(`Reset ${resetAccounts} accounts and removed ${inventoryDeleted.deletedCount} inventory items.`);
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (err) {
    console.error('Error resetting data:', err);
    process.exit(1);
  }
}

resetAllPlayerData();
