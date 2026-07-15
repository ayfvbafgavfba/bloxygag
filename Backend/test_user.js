const mongoose = require('mongoose');
const config = require('./config');
const Account = require('./models/account');

mongoose.connect(config.MONGODB_URI)
  .then(async () => {
    try {
      const user = await Account.findOne({}, { robloxId: 1, username: 1 });
      if (!user) {
        console.log('No users found in database');
        process.exit(1);
      }
      console.log(JSON.stringify({ robloxId: user.robloxId, username: user.username }));
      mongoose.connection.close();
      process.exit(0);
    } catch (err) {
      console.log('Error:', err.message);
      process.exit(1);
    }
  })
  .catch(e => {
    console.log('Connection error:', e.message);
    process.exit(1);
  });
