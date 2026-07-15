const mongoose = require('mongoose');

const apironeDepositSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  robloxId: { type: String, required: true },
  currency: { type: String, enum: ['LTC', 'ETH'], required: true },
  address: { type: String, required: true, unique: true },
  walletId: { type: String, required: true },
  amount: { type: Number, default: 0 },
  credited: { type: Boolean, default: false },
  lastChecked: { type: Date, default: new Date() },
  transactionId: { type: String, default: null },
  createdAt: { type: Date, default: new Date() },
  updatedAt: { type: Date, default: new Date() }
});

module.exports = mongoose.model('ApironeDeposit', apironeDepositSchema);
