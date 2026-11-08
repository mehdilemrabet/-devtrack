// Shared fixtures for tests: fake GitHub data and a fake fetch.

export function makeRepo(overrides = {}) {
  return {
    name: "demo",
    full_name: "octo/demo",
    html_url: "https://github.com/octo/demo",
    description: "A demo repository",
    language: "JavaScript",
    stargazers_count: 10,
    forks_count: 2,
    open_issues_count: 3,
    license: { spdx_id: "MIT", name: "MIT License" },
    fork: false,
    archived: false,
    has_issues: true,
    topics: ["demo"],
    owner: { login: "octo" },
    pushed_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-02T10:00:00Z",
    created_at: "2020-01-01T10:00:00Z",
    ...overrides
  };
}

export function jsonResponse(data, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });
}

// routes: { "/users/octo": data | (() => Response) } matched by path prefix (query included in key when given)
export function fakeFetch(routes, calls = []) {
  return async (url) => {
    const path = String(url).replace("https://api.github.com", "");
    calls.push(path);
    const key = Object.keys(routes).find((k) => path === k || path.startsWith(`${k}?`));
    if (!key) return jsonResponse({ message: "Not Found" }, { status: 404 });
    const value = routes[key];
    return typeof value === "function" ? value(path) : jsonResponse(value);
  };
}
