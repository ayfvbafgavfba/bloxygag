import config from "../config";

export const resolvePetImage = (imagePath) => {
  const placeholder = "/images/pet-placeholder.svg";
  if (!imagePath) return placeholder;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  // If the image path is an absolute site path (starts with /images),
  // serve it from the current origin (useful when the frontend is static-hosted).
  if (imagePath.startsWith('/images')) return imagePath;
  const normalizedPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  try {
    return `${config.api}${normalizedPath}`;
  } catch (e) {
    return placeholder;
  }
};
