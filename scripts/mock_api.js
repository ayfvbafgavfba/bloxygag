const http = require('http');
const url = require('url');
const port = process.env.PORT || 3220;

const items = [
  { item_name: 'Raccoon', display_name: 'Raccoon', item_image: 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/big_raccoon.webp', item_value: '100' },
  { item_name: 'Unicorn', display_name: 'Unicorn', item_image: 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/unicorn_rainbow.webp', item_value: '5000' },
  { item_name: 'Bear', display_name: 'Bear', item_image: 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/bear_rainbow.webp', item_value: '200' },
  { item_name: 'Black Dragon', display_name: 'Black Dragon', item_image: 'https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/black_dragon.webp', item_value: '1000' },
];

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname === '/marketplace/listings' && req.method === 'GET') {
    const listings = items.map((it, i) => ({ id: String(i + 1), owner: 'mock', price: Number(it.item_value) || 0, item: { item_name: it.item_name, display_name: it.display_name, item_image: it.item_image, item_value: it.item_value } }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, listings }));
    return;
  }

  if (parsed.pathname === '/admin/items' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, items }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Mock API running');
});

server.listen(port, '127.0.0.1', () => console.log(`Mock API listening on http://127.0.0.1:${port}`));
