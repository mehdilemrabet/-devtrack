// Input validation for values that end up in API paths or search queries.

export function normalizeUsername(input) {
  return String(input ?? "").trim().replace(/^@/, "");
}

export function isValidUsername(name) {
  return (
    /^[a-zA-Z0-9-]{1,39}$/.test(name) &&
    !name.startsWith("-") &&
    !name.endsWith("-") &&
    !name.includes("--")
  );
}

export function isValidRepoName(name) {
  return /^[A-Za-z0-9._-]{1,100}$/.test(name) && name !== "." && name !== "..";
}

export function isValidLanguage(name) {
  return name === "" || /^[A-Za-z0-9 #+.\-]{1,40}$/.test(name);
}
