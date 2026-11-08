# Architecture

DevTrack is a static single-page app: plain JavaScript modules bundled by Vite, no framework and no backend. It talks to the public GitHub REST API directly from the browser.

## Modules

| File | Responsibility | Touches the DOM? |
| --- | --- | --- |
| `src/api.js` | Requests, pagination (`Link` header), caching, rate-limit tracking, error classification (`GitHubError.kind`) | No |
| `src/cache.js` | 10-minute TTL cache, memory + `sessionStorage` | No |
| `src/metrics.js` | Totals, language shares, event summaries, UTC activity buckets | No |
| `src/repos.js` | Filter, sort, language list, health checklist | No |
| `src/export.js` | Report objects, CSV (formula-injection safe), Markdown | No |
| `src/router.js` | `#/u/…`, `#/o/…`, `#/r/owner/repo`, `#/compare/a/b`, `#/trending?…` | No |
| `src/validate.js`, `src/html.js` | Input validation, escaping, safe URLs | No |
| `src/views.js` | HTML strings for every screen | No (returns strings) |
| `src/app.js` | Routing, events, loading/error states, downloads | Yes |
| `src/main.js` | Entry point: `startApp()` | Yes |

Keeping everything except `app.js` free of DOM access is deliberate: it makes the logic testable in Node and the rendering testable as plain strings.

## Data flow

1. `app.js` reads `location.hash` with `parseRoute` and validates the parameters.
2. It calls one function from `api.js` (`fetchProfile`, `fetchOrg`, `fetchRepoDetail`, `fetchMostStarred`).
3. `api.js` checks the cache, calls `https://api.github.com`, updates the rate-limit indicator, and either returns data or throws a `GitHubError`.
4. `app.js` stores the screen state (filters, report builder) and renders the page with a function from `views.js`.
5. Filter inputs update only the repository results area; exports build a report from the current state.

## Endpoints used

All are documented public GitHub REST endpoints, called unauthenticated:

- `GET /users/{user}`, `/users/{user}/repos`, `/users/{user}/events/public`
- `GET /orgs/{org}`, `/orgs/{org}/repos`
- `GET /repos/{owner}/{repo}`, `/languages`, `/contributors`, `/releases/latest`
- `GET /search/repositories`

Add a new endpoint only after reading its documentation, and record it here.

## Security model

- Everything from the API is escaped (`escapeHtml`); links and images go through `safeUrl` (https and GitHub hosts only).
- Usernames, repository names and language filters are validated before they reach a URL or a search query.
- Production builds include a Content-Security-Policy that only allows scripts from the same origin and API calls to `api.github.com` (`vite.config.js`).
- No token handling exists. See `SECURITY.md`.

## Testing

`npm test` runs Node's built-in test runner:

- `tests/*.test.js` for pure modules,
- `tests/api.test.js` with a fake `fetch` (pagination, rate limits, errors, cache),
- `tests/views.test.js` for rendered HTML, including hostile data,
- `tests/app.test.js` runs the real app in jsdom against a fake API.

`tests/helpers.js` holds the fixtures. Tests never call the real GitHub API.

## Design decisions

- **Hash routing** keeps hosting trivial (any static host, no rewrite rules).
- **Relative Vite `base`** lets the same build work on GitHub Pages sub-paths.
- **No framework** keeps the bundle small (about 15 kB gzipped JavaScript) and the code approachable. Revisit if the UI grows much more complex.
