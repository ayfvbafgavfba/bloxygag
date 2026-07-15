const mongoose = require('mongoose');
const Account = require('./models/account');
const config = require('./config');

async function main() {
  await mongoose.connect(config.MONGODB_URI);
  const account = await Account.findOne({ username: 'big_AMUNGUS666' }).lean();
  console.log(account ? JSON.stringify({ id: account._id.toString(), robloxId: account.robloxId, username: account.username }) : 'Account not found');
  await mongoose.disconnect();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});