import config from "../config";

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2";
const PLACEHOLDER = "/images/pet-placeholder.svg";
const GAG2_IMAGE_EXTENSIONS = "png|jpg|jpeg|webp|svg";
const DEFAULT_PET_IMAGE = "/images/pets/unicorn.png";
const BEAR_PET_IMAGE = "/images/gag2/bear_rainbow.webp";
const ROFLIPS_BASE = "https://growagarden.roflips.com";

const ROFLIPS_PET_BASE_NAMES = new Set([
  "raccoon",
  "black dragon",
  "ice serpent",
  "monkey",
  "golden dragonfly",
  "unicorn",
  "bear",
  "bald eagle",
  "butterfly",
  "bunny",
  "frog",
  "deer",
  "owl",
  "turtle",
  "firefly",
  "robin",
]);

function getRoflipsPetImage(itemName = "") {
  const rawName = (itemName || "").toString().trim();
  if (!rawName) return null;

  const normalized = rawName
    .replace(/’/g, "'")
    .replace(/['"]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  let baseName = normalized;
  if (baseName.startsWith("rainbow mega ")) {
    baseName = baseName.replace(/^rainbow mega\s+/, "");
  } else if (baseName.startsWith("mega ")) {
    baseName = baseName.replace(/^mega\s+/, "");
  } else if (baseName.startsWith("rainbow big ")) {
    baseName = baseName.replace(/^rainbow big\s+/, "");
  } else if (baseName.startsWith("big ")) {
    baseName = baseName.replace(/^big\s+/, "");
  } else if (baseName.startsWith("rainbow ")) {
    baseName = baseName.replace(/^rainbow\s+/, "");
  }

  if (!ROFLIPS_PET_BASE_NAMES.has(baseName)) {
    return null;
  }

  let path = normalized;
  if (path.startsWith("rainbow mega ")) {
    path = path.replace(/^rainbow mega\s+/, "rainbow-huge-");
  } else if (path.startsWith("mega ")) {
    path = path.replace(/^mega\s+/, "huge-");
  } else if (path.startsWith("rainbow big ")) {
    path = path.replace(/^rainbow big\s+/, "rainbow-big-");
  } else if (path.startsWith("big ")) {
    path = path.replace(/^big\s+/, "big-");
  } else if (path.startsWith("rainbow ")) {
    path = path.replace(/^rainbow\s+/, "rainbow-");
  }

  path = path.replace(/\s+/g, "-");
  return `${ROFLIPS_BASE}/${path}.png`;
}

function isRaccoonLike(imagePath = "", itemName = "") {
  const source = (imagePath || "").toString().trim().toLowerCase();
  const normalizedItemName = (itemName || "").toString().trim().toLowerCase();
  return (
    source.includes("raccoon") ||
    normalizedItemName.includes("raccoon") ||
    /(^|\/)raccoon(?:\.[^/]+)?$/i.test(source)
  );
}

function isUnicornLike(imagePath = "", itemName = "") {
  const source = (imagePath || "").toString().trim().toLowerCase();
  const normalizedItemName = (itemName || "").toString().trim().toLowerCase();
  return (
    source.includes("unicorn") ||
    normalizedItemName.includes("unicorn") ||
    /(^|\/)unicorn(?:\.[^/]+)?$/i.test(source)
  );
}

function isBearLike(imagePath = "", itemName = "") {
  const source = (imagePath || "").toString().trim().toLowerCase();
  const normalizedItemName = (itemName || "").toString().trim().toLowerCase();
  return (
    source.includes("bear") ||
    normalizedItemName.includes("bear") ||
    /(^|\/)bear(?:\.[^/]+)?$/i.test(source)
  );
}

function isPlainBear(itemName = "") {
  return (itemName || "").toString().trim().toLowerCase() === "bear";
}

function getGag2Filename(imagePath) {
  const path = (imagePath || "").toString();
  const match = path.match(new RegExp(`([^/\\?#]+\.(?:${GAG2_IMAGE_EXTENSIONS}))(?:[?#].*)?$`, "i"));
  return match ? match[1] : null;
}

function getGag2GithubUrl(imagePath) {
  const filename = getGag2Filename(imagePath);
  return filename ? `${GITHUB_RAW_BASE}/${filename}` : null;
}

function isGag2Source(imagePath) {
  if (!imagePath) return false;
  const source = imagePath.toString().toLowerCase();
  return (
    source.includes("gag2.gg") ||
    source.includes("cdn.gag2.gg") ||
    source.includes("bloxygag.org/images/gag2") ||
    source.includes("/images/gag2/") ||
    source.includes("images/gag2/") ||
    source.includes("/gag2/") ||
    source.startsWith("gag2/")
  );
}

export const resolvePetImage = (imagePath, itemName = "") => {
  const source = (imagePath || "").toString().trim();
  const lowerSource = source.toLowerCase();
  const isRaccoon = isRaccoonLike(source, itemName);
  const isUnicorn = isUnicornLike(source, itemName);
  const isBear = isBearLike(source, itemName);

  const roflipsImage = getRoflipsPetImage(itemName);
  if (roflipsImage) {
    return roflipsImage;
  }

  if (isRaccoon) {
    return "/images/pets/raccoon.png";
  }

  if (isUnicorn) {
    return "/images/pets/unicorn.png";
  }

  if (isBear || isPlainBear(itemName)) {
    return BEAR_PET_IMAGE;
  }

  if (!source || ["null", "undefined", "none", "n/a"].includes(lowerSource)) {
    return PLACEHOLDER;
  }

  if (/^data:/i.test(source)) {
    return source;
  }

  const githubUrl = getGag2GithubUrl(source);
  const isAbsoluteUrl = /^https?:\/\//i.test(source);
  const gag2Filename = getGag2Filename(source);

  // Prefer local gag2 assets if available in /images/gag2
  if (gag2Filename && (isGag2Source(source) || /raw\.githubusercontent\.com/i.test(source))) {
    return `/images/gag2/${gag2Filename}`;
  }

  if (githubUrl && !isAbsoluteUrl && !source.startsWith("/images/")) {
    return githubUrl;
  }

  if (isAbsoluteUrl) {
    return source;
  }

  const normalizedPath = source.startsWith("/") ? source : `/${source}`;
  if (normalizedPath.startsWith("/images")) return normalizedPath;

  try {
    return `${config.api}${normalizedPath}`;
  } catch (e) {
    return PLACEHOLDER;
  }
};
