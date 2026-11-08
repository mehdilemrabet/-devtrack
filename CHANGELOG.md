# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/) (while below 1.0.0, minor versions may include breaking changes).

## [0.2.0] - 2026-11-08

### Added
- Organization analytics (`#/o/<name>`) and repository pages (`#/r/<owner>/<repo>`) with a health checklist, language bytes, top contributors and latest release.
- Repository search, filter (language, forks, archived) and sort, with "show more".
- Compare two profiles (`#/compare/<a>/<b>`).
- Most starred new repositories via the Search API (`#/trending`), labeled as not being GitHub's Trending page.
- JSON, CSV (formula-injection safe, UTF-8 BOM) and Markdown exports.
- Pagination up to 500 repositories, 10-minute response cache, rate-limit indicator and rate-limit error state.
- Content-Security-Policy in production builds, input validation and safe-URL handling.
- Tests for filters, health checks, API client, exports, routing, views (including hostile data) and the full app in jsdom.
- CI on Node 20 and 22, release workflow, manual GitHub Pages workflow, Dependabot.
- SECURITY.md, issue templates, pull request template, roadmap and developer documentation.

### Changed
- Activity charts use UTC days, matching GitHub timestamps.
- Larger minimum font sizes and higher text contrast; focus outlines, skip link, live regions and reduced-motion support.
- The app is split into small modules (`api`, `views`, `app`, `metrics`, `repos`, `export`, `router`).

### Fixed
- Decorative background blobs no longer cause sideways scrolling, especially on phones.
- The project is now delivered as source files (the repository previously held only a `.zip`), with a lockfile so `npm ci` and CI work.

## [0.1.0]

- Initial MVP: single-profile dashboard with repository list, language mix and 30-day public activity.
