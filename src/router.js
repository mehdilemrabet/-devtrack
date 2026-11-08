// Hash-based routing: #/u/name, #/o/name, #/r/owner/repo, #/compare/a/b, #/trending

function decode(part) {
  try { return decodeURIComponent(part); } catch { return part; }
}

export function parseRoute(hash = "") {
  const [path, query = ""] = String(hash).replace(/^#\/?/, "").split("?");
  const parts = path.split("/").filter(Boolean).map(decode);
  const params = Object.fromEntries(new URLSearchParams(query));
  if (!parts.length) return { name: "home", params };
  const [head, a, b] = parts;
  if (head === "u" && a) return { name: "user", username: a, params };
  if (head === "o" && a) return { name: "org", org: a, params };
  if (head === "r" && a && b) return { name: "repo", owner: a, repo: b, params };
  if (head === "compare") return { name: "compare", a: a || "", b: b || "", params };
  if (head === "trending") return { name: "trending", params };
  return { name: "notfound", params };
}

const enc = encodeURIComponent;
export const href = {
  home: () => "#/",
  user: (name) => `#/u/${enc(name)}`,
  org: (name) => `#/o/${enc(name)}`,
  repo: (owner, repo) => `#/r/${enc(owner)}/${enc(repo)}`,
  compare: (a = "", b = "") => (a && b ? `#/compare/${enc(a)}/${enc(b)}` : "#/compare"),
  trending: ({ language = "", days = 30 } = {}) => {
    const query = new URLSearchParams();
    if (language) query.set("language", language);
    if (days !== 30) query.set("days", String(days));
    const text = query.toString();
    return text ? `#/trending?${text}` : "#/trending";
  }
};
