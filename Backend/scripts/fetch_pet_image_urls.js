const fetch = require('node-fetch');

const files = [
  'File:Monkey.png',
  'File:GoldenDragonfly.png',
  'File:Unicorn.png',
  'File:Bear.png',
  'File:BaldEagle.png',
  'File:Racoon.png',
  'File:BlackDragon.png',
  'File:IceSerpent.png',
];

async function run() {
  const base = 'https://growagarden2.fandom.com/api.php';
  const titles = files.join('|');
  const url = `${base}?action=query&format=json&prop=imageinfo&iiprop=url&titles=${encodeURIComponent(titles)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const pages = data.query.pages;
  for (const id in pages) {
    const page = pages[id];
    if (page.missing) {
      console.log(`${page.title}: MISSING`);
    } else {
      console.log(`${page.title}: ${page.imageinfo[0].url}`);
    }
  }
}

run().catch(console.error);
