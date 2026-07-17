const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '..', 'Backend', 'public', 'images', 'gag2');
const frontendDir = path.join(__dirname, '..', 'Frontend', 'public', 'images', 'gag2');

if (!fs.existsSync(backendDir)) {
  console.error('Backend gag2 dir not found:', backendDir);
  process.exit(1);
}
if (!fs.existsSync(frontendDir)) {
  fs.mkdirSync(frontendDir, { recursive: true });
}

const files = fs.readdirSync(backendDir).filter(f => f.match(/\.(png|webp|jpg|jpeg|gif)$/i));
for (const f of files) {
  const src = path.join(backendDir, f);
  const dst = path.join(frontendDir, f);
  fs.copyFileSync(src, dst);
  console.log('copied', f);
}
console.log('done');
