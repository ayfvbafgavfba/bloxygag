const DEFAULT_ADMIN_ALLOWLIST = ["welovemontana", "bloxpvp", "big_AMUNGUS666"];

export const getAdminAllowlist = () => {
  if (typeof window === "undefined") {
    return DEFAULT_ADMIN_ALLOWLIST;
  }

  try {
    const stored = window.localStorage.getItem("adminAllowlist");
    if (!stored) {
      return DEFAULT_ADMIN_ALLOWLIST;
    }

    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    console.error("Failed to parse admin allowlist", error);
  }

  return DEFAULT_ADMIN_ALLOWLIST;
};

export const isAdminUser = (username, rank) => {
  if (rank && typeof rank === "string") {
    const normalizedRank = rank.trim().toLowerCase();
    if (normalizedRank !== "user") {
      return true;
    }
  }

  if (!username) {
    return false;
  }

  const normalizedUsername = username.trim().toLowerCase();
  return getAdminAllowlist().some(
    (entry) => entry.trim().toLowerCase() === normalizedUsername
  );
};
