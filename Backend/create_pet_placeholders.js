const fs = require('fs');
const path = require('path');

// Create SVG pet placeholders
const pets = {
  'monkey': { color: '#8B4513', emoji: '🐵' },
  'goldendragonfly': { color: '#FFD700', emoji: '🐉' },
  'unicorn': { color: '#FF69B4', emoji: '🦄' },
  'bear': { color: '#654321', emoji: '🐻' },
  'baldeagle': { color: '#8B7355', emoji: '🦅' },
  'raccoon': { color: '#808080', emoji: '🦝' },
  'blackdragon': { color: '#1a1a1a', emoji: '🐲' },
  'iceserpent': { color: '#87CEEB', emoji: '🐍' },
  'robin': { color: '#FF6347', emoji: '🐦' },
  'bee': { color: '#FFD700', emoji: '🐝' },
  'butterfly': { color: '#FF1493', emoji: '🦋' },
  'deer': { color: '#8B4513', emoji: '🦌' },
  'turtle': { color: '#228B22', emoji: '🐢' },
  'owl': { color: '#654321', emoji: '🦉' },
  'frog': { color: '#00AA44', emoji: '🐸' },
  'bunny': { color: '#FFB6C1', emoji: '🐰' },
};

const petsDir = path.join(__dirname, '../public/images/pets');

// Create directory if it doesn't exist
if (!fs.existsSync(petsDir)) {
  fs.mkdirSync(petsDir, { recursive: true });
}

// Generate SVG for each pet
for (const [petName, petData] of Object.entries(pets)) {
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <style>
      .pet-body { fill: ${petData.color}; }
      .pet-text { font-size: 60px; text-anchor: middle; }
    </style>
  </defs>
  <!-- Background -->
  <rect width="120" height="120" fill="#f0f0f0" rx="10"/>
  <!-- Pet emoji/placeholder -->
  <text class="pet-text" x="60" y="75">${petData.emoji}</text>
</svg>`;

  const filePath = path.join(petsDir, `${petName}.svg`);
  fs.writeFileSync(filePath, svgContent);
  console.log(`✓ Created ${petName}.svg`);
}

console.log(`\n✅ All placeholder pet images created in ${petsDir}`);
console.log(`\nNext steps:`);
console.log(`1. Replace these SVG placeholder files with actual pet images`);
console.log(`2. Keep the same filenames (e.g., monkey.svg → monkey.png)`);
console.log(`3. Supported formats: .svg, .png, .jpg, .webp`);
console.log(`4. Recommended size: 120x120px or larger`);
