const mongoose = require('mongoose');
const Account = require('./models/account');
const config = require('./config');

async function test() {
  await mongoose.connect(config.MONGODB_URI);
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    // Test finding user without session
    const user1 = await Account.findOne({ username: 'big_AMUNGUS666' });
    console.log('Without session:', user1 ? 'Found' : 'Not found');
    
    // Test finding user with session
    const user2 = await Account.findOne({ username: 'big_AMUNGUS666' })
      .session(session)
      .exec();
    console.log('With session:', user2 ? 'Found' : 'Not found');
    
    await session.abortTransaction();
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    session.endSession();
    await mongoose.disconnect();
  }
}

test();