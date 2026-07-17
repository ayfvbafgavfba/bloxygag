import config from "../config";

export const resolvePetImage = (imagePath) => {
  const placeholder = "/images/pet-placeholder.svg";
  if (!imagePath) return placeholder;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const normalizedPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  try {
    return `${config.api}${normalizedPath}`;
  } catch (e) {
    return placeholder;
  }
};
