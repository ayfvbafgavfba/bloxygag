import config from "../config";

const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2";
const PLACEHOLDER = "/images/pet-placeholder.svg";
const GAG2_IMAGE_EXTENSIONS = "png|jpg|jpeg|webp|svg";

function getGag2GithubUrl(imagePath) {
  const path = (imagePath || "").toString();
  const filenameMatch = path.match(new RegExp(`/([^/\\?#]+\\.(?:${GAG2_IMAGE_EXTENSIONS}))(?:[?#].*)?$`, "i"));
  if (!filenameMatch) return null;
  return `${GITHUB_RAW_BASE}/${filenameMatch[1]}`;
}

export const resolvePetImage = (imagePath) => {
  if (!imagePath) return PLACEHOLDER;
  const source = imagePath.toString().trim();
  if (!source) return PLACEHOLDER;

  const lowerSource = source.toLowerCase();
  const isAbsoluteUrl = /^https?:\/\//i.test(source);
  const isGag2Image = lowerSource.includes("/images/gag2/") || lowerSource.includes("gag2.gg") || lowerSource.includes("bloxygag.org/images/gag2") || lowerSource.includes("/gag2/");
  const githubUrl = getGag2GithubUrl(source);

  if (isGag2Image && githubUrl) {
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
