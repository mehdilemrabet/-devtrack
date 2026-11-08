// Small helpers for building HTML strings safely.

export const AVATAR_HOSTS = ["avatars.githubusercontent.com"];

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

/**
 * Returns the URL only if it is an https URL on an allowed host,
 * otherwise the fallback. Used for every link or image that comes from API data.
 */
export function safeUrl(value, hosts = ["github.com"], fallback = "#") {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" || !hosts.includes(url.hostname)) return fallback;
    return url.href;
  } catch {
    return fallback;
  }
}

/** Any https URL (for user-provided websites). Returns null when unsafe. */
export function safeExternalUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
