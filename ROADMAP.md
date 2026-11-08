# Roadmap

This roadmap lists intentions, not promises. Items move when someone does the work. Want to help? Pick something marked **help wanted** in the issue tracker.

## Done (0.2.0)

- [x] Profile and organization analytics
- [x] Repository search, filter and sort
- [x] Repository pages with health checklist, languages, contributors and latest release
- [x] Compare two profiles
- [x] Most starred new repositories (Search API)
- [x] JSON, CSV and Markdown exports
- [x] Pagination, response caching, rate-limit display and clear error states
- [x] Security hardening: escaping, safe URLs, input validation, Content-Security-Policy
- [x] Tests (unit, API with a fake fetch, app-level in jsdom) and CI on Node 20 and 22
- [x] Open-source basics: license, contributing guide, code of conduct, security policy, issue and PR templates

## Next

- [ ] Real screenshots and a public live demo (GitHub Pages workflow is ready, see `docs/MAINTAINER_GUIDE.fr.md`)
- [ ] Self-hosted fonts (removes the Google Fonts request)
- [ ] ESLint and Prettier, run in CI
- [ ] Browser end-to-end tests (Playwright) with mocked API fixtures
- [ ] Light theme and a theme toggle
- [ ] Show the last known rate limit even when a response comes from the cache

## Later

- [ ] Optional personal access token entered by the visitor and kept in memory only (needs a security review)
- [ ] Type checking with JSDoc and `tsc --checkJs`
- [ ] Language breakdown by bytes for a profile's top repositories (opt-in because of the extra requests)
- [ ] Load more than 500 repositories
- [ ] Translations (French first)
- [ ] Shareable report pages

## Principles

1. Real data only, clearly labeled. No fabricated numbers, ever.
2. Documented GitHub endpoints only.
3. Respect users' privacy and GitHub's rate limits.
4. Small, tested, reviewable changes.
