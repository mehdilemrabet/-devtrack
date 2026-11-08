# Ideas for first issues

Copy these into GitHub issues (suggested labels in brackets). They are real gaps in the current code, not filler.

## Good first issues

1. **Self-host the fonts** [`good first issue`, `privacy`] — Fonts are loaded from Google Fonts, so Google sees every visitor's IP. Bundle DM Sans and Space Grotesk locally and remove the Google domains from `index.html` and the CSP in `vite.config.js`. *Done when:* no request leaves for `fonts.googleapis.com` and the look is unchanged.
2. **Remember the last rate limit** [`good first issue`] — The header pill shows nothing when a page is served entirely from the cache. Store the last known values in `sessionStorage`. *Done when:* the pill survives a reload, with a test in `tests/api.test.js`.
3. **Keyboard shortcut to focus search** [`good first issue`, `accessibility`] — Pressing `/` focuses the search box (unless a field is already focused). *Done when:* it works and is mentioned in the README.
4. **ESLint and Prettier** [`good first issue`, `tooling`] — Add configs, an `npm run lint` script and a CI step. Fix what it reports without changing behavior.
5. **Topic chips as filters** [`good first issue`, `enhancement`] — Make topic chips on repository rows clickable to filter the list (repositories already include `topics`).
6. **Empty-state illustrations and copy review** [`good first issue`, `design`] — Review loading, empty and error messages for clarity and tone.

## Help wanted

7. **Playwright end-to-end tests** [`help wanted`, `testing`] — Mock `api.github.com` with fixtures and check each screen at desktop and mobile widths.
8. **Light theme and toggle** [`help wanted`, `design`] — Keep dark as default; respect `prefers-color-scheme` only when the user opts in; keep contrast at WCAG AA.
9. **Type checking with JSDoc** [`help wanted`, `tooling`] — Add `// @ts-check` and `tsc --noEmit --allowJs --checkJs` to CI, module by module.
10. **Optional token support** [`help wanted`, `security`, `needs discussion`] — Let a visitor paste a personal access token that stays in memory only, to raise the rate limit. Needs a written threat model before any code.
11. **Load beyond 500 repositories** [`help wanted`, `enhancement`] — Add an explicit "load more" that continues pagination, with a clear request-cost warning.
12. **French translation** [`help wanted`, `i18n`] — Extract user-facing strings from `src/views.js` and `src/app.js` into a small dictionary first, then translate.

## Labels to create

`good first issue`, `help wanted`, `bug`, `enhancement`, `documentation`, `accessibility`, `design`, `testing`, `tooling`, `security`, `privacy`, `i18n`, `needs discussion`.
