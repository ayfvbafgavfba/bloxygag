const mongoose = require('mongoose');
const Item = require('./models/item');
const config = require('./config');

(async () => {
  await mongoose.connect(config.MONGODB_URI);
  const items = await Item.find({ item_name: { $in: ['Raccoon', 'Monkey', 'Bear', 'Frog'] } });
  items.forEach(item => {
    console.log(item.item_name + ': ' + item.item_image);
  });
  mongoose.connection.close();
})();
