const mongoose = require('mongoose');
const Item = require('./models/item');

async function main() {
  const uri = process.argv[2];
  if (!uri) {
    console.error('Usage: node tmp_check_items.js <mongo-uri>');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, { dbName: 'bloxpvp' });
    const count = await Item.countDocuments();
    const sample = await Item.find().limit(10).select('item_name display_name game item_type item_value').lean();
    console.log('COUNT', count);
    console.log(JSON.stringify(sample, null, 2));
  } catch (err) {
    console.error('ERR', err && err.message);
  } finally {
    await mongoose.disconnect();
  }
}

main();
