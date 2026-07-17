import config from "../config";

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2";
const PLACEHOLDER = "/images/pet-placeholder.svg";
const GAG2_IMAGE_EXTENSIONS = "png|jpg|jpeg|webp|svg";

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

export const resolvePetImage = (imagePath) => {
  if (!imagePath) return PLACEHOLDER;
  const source = imagePath.toString().trim();
  if (!source) return PLACEHOLDER;

  const lowerSource = source.toLowerCase();
  if (["null", "undefined", "none", "n/a"].includes(lowerSource)) {
    return PLACEHOLDER;
  }

  if (/^data:/i.test(source)) {
    return source;
  }

  const githubUrl = getGag2GithubUrl(source);
  const isAbsoluteUrl = /^https?:\/\//i.test(source);

  if (githubUrl && isGag2Source(source)) {
    return githubUrl;
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
