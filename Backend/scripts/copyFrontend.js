const fs = require("fs");
const path = require("path");

const frontendDist = path.resolve(__dirname, "..", "..", "Frontend", "dist");
const backendPublic = path.resolve(__dirname, "..", "public");

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function cleanDir(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
  }
}

try {
  cleanDir(backendPublic);
  copyRecursive(frontendDist, backendPublic);
  console.log(`Copied frontend dist from ${frontendDist} to ${backendPublic}`);
} catch (err) {
  console.error("Failed to copy frontend dist:", err);
  process.exit(1);
}
