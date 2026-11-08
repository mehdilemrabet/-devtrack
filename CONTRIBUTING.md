# Contributing to DevTrack

Thanks for considering a contribution. DevTrack is small on purpose, so changes are easy to review.

## Before you start

1. Check existing issues and pull requests to avoid duplicate work.
2. For a substantial change, open an issue first to agree on the approach.
3. Looking for something to do? See [docs/FIRST_ISSUES.md](docs/FIRST_ISSUES.md) and issues labeled `good first issue`.
4. Keep each pull request focused on one thing and explain the user problem it solves.

## Development setup

Requires Node.js 20 or newer.

```bash
git clone https://github.com/mehdilemrabet/devtrack.git
cd devtrack
npm ci
npm run dev
```

Before opening a pull request:

```bash
npm run check    # runs the tests, then the production build
```

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for where things live.

## Ground rules for this project

- **Real data only.** Never show invented numbers. If GitHub does not provide something, say it is unavailable.
- **Label what you show.** Keep repository metrics, public events and derived figures clearly separate.
- **Documented endpoints only.** Link the GitHub REST API documentation for any new endpoint in your pull request.
- **Be kind to rate limits.** Prefer fewer requests, use the shared cache in `src/api.js`, and handle errors.
- **Escape everything from the API.** Use `escapeHtml` for text and `safeUrl` for links and images in `src/views.js`.
- **No secrets.** Never commit tokens or personal data. Features that need a token require a security discussion first.

## Pull request checklist

- [ ] The change has a clear purpose and description.
- [ ] `npm run check` passes.
- [ ] Tests are added or updated (pure logic in `metrics`, `repos`, `export`, `router`; API behavior in `tests/api.test.js`; screens in `tests/views.test.js` or `tests/app.test.js`).
- [ ] UI changes were checked at desktop and mobile width, with keyboard only, and have loading, empty and error states.
- [ ] Docs and `CHANGELOG.md` are updated when behavior changes.

## Code style

- Clear names and small functions; plain JavaScript modules and browser-native APIs.
- Keep dependencies to a minimum; a new runtime dependency needs a good reason.
- Comments explain *why*, not *what*.

## Reporting bugs and security issues

Use the issue templates for bugs and feature requests. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).
