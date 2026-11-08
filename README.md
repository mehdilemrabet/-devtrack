# DevTrack — Your GitHub, in focus

DevTrack is an open-source dashboard that turns **public GitHub data** into a clear picture of a developer's or organization's work: repositories, reach, languages, recent activity and repository health. It runs entirely in your browser, with no account, no server and no token.

<!-- Add a real screenshot here once you have one: ![DevTrack profile view](docs/screenshots/profile.png) -->

## Features

- **Profile analytics** — repositories, total stars and forks, language mix and recent public activity for any user.
- **Organization analytics** — the same overview for organizations, plus their most starred repositories.
- **Repository search, filter and sort** — by name, description, topic or language; hide forks or archived repositories; sort by update, push, stars, forks, open issues or name.
- **Repository pages** — stars, forks, watchers, contributors, language breakdown by bytes of code, top contributors, latest release and a transparent **health checklist**.
- **Compare two profiles** — side by side, with the leading value highlighted per metric.
- **Most starred new repositories** — repositories created in the last 7/30/90 days, ranked by stars, with an optional language filter.
- **Exports** — JSON, CSV and Markdown reports of what you see (CSV cells are protected against spreadsheet formula injection).
- **Rate-limit aware** — shows the remaining API requests, caches responses for 10 minutes and explains clearly when GitHub's limit is reached.
- Dark interface by default, responsive layout, keyboard-accessible controls, reduced-motion support.

## What the numbers mean

DevTrack keeps three kinds of data apart and says which one each screen shows:

| Kind | Examples | Source |
| --- | --- | --- |
| **Repository metrics** | stars, forks, open issues, languages, license, last push | repository objects from the REST API |
| **Public events** | pushes, pull requests, comments in the last ~90 days | the public events feed — **not** the contribution graph, and private activity is never included |
| **Derived figures** | star/fork totals, health checklist | computed from the data above; the health checklist is a heuristic, not an official GitHub metric |

DevTrack never invents data. When GitHub does not return something (for example contributors for a very large repository), the screen says it is unavailable instead of guessing.

GitHub has no official "trending" API, so "Most starred new repositories" uses the documented Search API (`created:>date`, sorted by stars) and is labeled as such.

## Quick start

Requires Node.js 20 or newer.

```bash
git clone https://github.com/mehdilemrabet/devtrack.git
cd devtrack
npm ci
npm run dev        # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm test` | Run the automated tests (Node's built-in test runner + jsdom) |
| `npm run build` | Create the production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run check` | Tests and build in one go (what CI runs) |

The build uses relative paths, so the contents of `dist/` can be hosted on any static host, including GitHub Pages.

## Rate limits and privacy

- DevTrack calls `https://api.github.com` **without authentication**. GitHub allows a limited number of unauthenticated requests per hour per IP address (and fewer for search). A profile uses roughly 3–9 requests, a repository page 5. The header shows how many remain.
- No token is ever requested, stored or sent. Adding optional token support is on the roadmap and requires a security review first.
- Responses are cached in your browser tab (`sessionStorage`) for 10 minutes. Nothing is sent to any DevTrack server because there is none.
- The interface loads fonts from Google Fonts, which means Google receives the visitor's IP address. Self-hosting the fonts is a good first issue ([docs/FIRST_ISSUES.md](docs/FIRST_ISSUES.md)).

## Project layout

```
src/
  api.js      GitHub client: pagination, caching, rate-limit and error handling
  app.js      Page wiring: routing, events, loading/error states, exports
  views.js    HTML builders for every screen (pure, escaped, tested)
  metrics.js  Numbers from API data      repos.js   Filter, sort, health checklist
  export.js   JSON / CSV / Markdown      router.js  Hash routes (#/u/name, #/r/owner/repo ...)
  html.js     Escaping and safe URLs     validate.js  Input validation
tests/        Unit tests, API tests with a fake fetch, and app tests in jsdom
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Project status and roadmap

DevTrack is an early-stage project (version 0.x). See [ROADMAP.md](ROADMAP.md) for what is planned and [PROJECT_STATUS.md](PROJECT_STATUS.md) for what has been verified. There are no usage statistics to report yet.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), browse the ideas in [docs/FIRST_ISSUES.md](docs/FIRST_ISSUES.md), and follow the [Code of Conduct](CODE_OF_CONDUCT.md). Please report security problems privately as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). DevTrack is an independent community project and is not affiliated with or endorsed by GitHub.
