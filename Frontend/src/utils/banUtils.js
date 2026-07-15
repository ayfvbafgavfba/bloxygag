import config from "../config";

/**
 * Check if a user is banned (checks backend first, then localStorage)
 * @param {string} username - The Roblox username to check
 * @returns {boolean} - True if user is banned, false otherwise
 */
export const isUserBanned = (username) => {
  if (!username) return false;
  const bannedUsers = localStorage.getItem("bannedUsers");
  if (!bannedUsers) return false;
  
  try {
    const banned = JSON.parse(bannedUsers);
    return banned.includes(username.toLowerCase());
  } catch (e) {
    return false;
  }
};

/**
 * Check if a user is banned with backend verification
 * @param {string} username - The Roblox username to check
 * @param {string} token - JWT token for auth
 * @returns {Promise<boolean>} - True if user is banned, false otherwise
 */
export const checkBannedWithBackend = async (username, token) => {
  if (!username || !token) return false;
  
  try {
    const response = await fetch(`${config.api}/disciplinary/check?username=${encodeURIComponent(username)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.isBanned || false;
    }
  } catch (error) {
    console.error("Error checking ban status with backend:", error);
  }
  
  return false;
};

/**
 * Get the list of banned users
 * @returns {Array} - Array of banned usernames
 */
export const getBannedUsers = () => {
  const bannedUsers = localStorage.getItem("bannedUsers");
  if (!bannedUsers) return [];
  
  try {
    return JSON.parse(bannedUsers);
  } catch (e) {
    return [];
  }
};

/**
 * Check if a user is muted (checks backend first, then localStorage)
 * @param {string} username - The Roblox username to check
 * @returns {boolean} - True if user is muted, false otherwise
 */
export const isUserMuted = (username) => {
  if (!username) return false;
  const mutedUsers = localStorage.getItem("mutedUsers");
  if (!mutedUsers) return false;

  try {
    const muted = JSON.parse(mutedUsers);
    return muted.includes(username.toLowerCase());
  } catch (e) {
    return false;
  }
};

/**
 * Check if a user is muted with backend verification
 * @param {string} username - The Roblox username to check
 * @param {string} token - JWT token for auth
 * @returns {Promise<boolean>} - True if user is muted, false otherwise
 */
export const checkMutedWithBackend = async (username, token) => {
  if (!username || !token) return false;
  
  try {
    const response = await fetch(`${config.api}/disciplinary/check?username=${encodeURIComponent(username)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.isMuted || false;
    }
  } catch (error) {
    console.error("Error checking mute status with backend:", error);
  }
  
  return false;
};

/**
 * Get the list of muted users
 * @returns {Array} - Array of muted usernames
 */
export const getMutedUsers = () => {
  const mutedUsers = localStorage.getItem("mutedUsers");
  if (!mutedUsers) return [];

  try {
    return JSON.parse(mutedUsers);
  } catch (e) {
    return [];
  }
};
