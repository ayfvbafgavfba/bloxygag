const mongoose = require('mongoose');
const Item = require('./models/item');
const config = require('./config');

async function main() {
  await mongoose.connect(config.MONGODB_URI);
  const query = {
    $or: [
      { item_name: /golden/i },
      { item_name: /huge/i },
      { item_name: /cat/i },
      { item_name: /dog/i },
      { item_name: /rainbow/i },
      { item_name: /titanic/i },
    ],
  };
  const items = await Item.find(query).limit(100).lean();
  for (const i of items) {
    console.log(i.item_name);
  }
  await mongoose.disconnect();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});