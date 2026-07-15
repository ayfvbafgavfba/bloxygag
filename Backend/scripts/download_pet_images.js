const fs = require('fs');
const path = require('path');
const fetch = globalThis.fetch || require('node-fetch');

const petImages = {
  Raccoon: 'https://static.wikia.nocookie.net/growagarden27847/images/7/73/Racoon.png/revision/latest?cb=20260612232005',
  'Black Dragon': 'https://static.wikia.nocookie.net/growagarden27847/images/7/75/BlackDragon.png/revision/latest?cb=20260623231125',
  'Ice Serpent': 'https://static.wikia.nocookie.net/growagarden27847/images/5/51/IceSerpent.png/revision/latest?cb=20260612231814',
  Monkey: 'https://static.wikia.nocookie.net/growagarden27847/images/2/27/Monkey.png/revision/latest?cb=20260612231816',
  'Golden Dragonfly': 'https://static.wikia.nocookie.net/growagarden27847/images/e/ee/GoldenDragonfly.png/revision/latest?cb=20260612231815',
  Unicorn: 'https://static.wikia.nocookie.net/growagarden27847/images/7/7e/Unicorn.png/revision/latest?cb=20260612212539',
  Bear: 'https://static.wikia.nocookie.net/growagarden27847/images/a/a4/Bear.png/revision/latest?cb=20260619225420',
  'Bald Eagle': 'https://static.wikia.nocookie.net/growagarden27847/images/d/d2/BaldEagle.png/revision/latest?cb=20260703230412',
};

const outputDir = path.join(__dirname, '../public/images/pets');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

(async () => {
  for (const [petName, url] of Object.entries(petImages)) {
    const filename = petName.toLowerCase().replace(/ /g, '') + '.png';
    const outputPath = path.join(outputDir, filename);
    process.stdout.write(`Downloading ${petName}... `);
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PetImageDownloader/1.0; +https://example.com)'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const buffer = await res.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      console.log('OK');
    } catch (err) {
      console.error(`FAILED: ${err.message}`);
    }
  }
})();
