import config from "../config";

export const resolvePetImage = (imagePath) => {
  const placeholder = "/images/pet-placeholder.svg";
  if (!imagePath) return placeholder;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const normalizedPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  if (/^\/images\/gag2\//i.test(normalizedPath)) {
    const filename = normalizedPath.split('/').pop();
    if (filename) {
      return `https://raw.githubusercontent.com/ayfvbafgavfba/bloxygag/main/Frontend/public/images/gag2/${filename}`;
    }
  }
  // If the image path is an absolute site path (starts with /images),
  // serve it from the current origin (useful when the frontend is static-hosted).
  if (normalizedPath.startsWith('/images')) return normalizedPath;
  try {
    return `${config.api}${normalizedPath}`;
  } catch (e) {
    return placeholder;
  }
};
