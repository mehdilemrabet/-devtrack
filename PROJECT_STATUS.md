# Project status

DevTrack is an early-stage project (0.2.0). It has no established user base, download counts or external contributors yet, and nothing in this repository claims otherwise.

## Verified on 2026-11-08

- 43 automated tests pass (`npm test`), covering the API client, filters, health checks, exports, routing, hostile-data escaping and the full app running in jsdom.
- The production build succeeds (`npm run build`).
- The app was run in headless Chromium: all screens rendered, no page errors, no horizontal scrolling at 1280px and 390px, and the real GitHub API's rate-limit response (observed from the build environment) produced the documented error state.
- GitHub's CORS preflight accepts the `X-GitHub-Api-Version` header the client sends.

## Not verified yet

- The CI, release and Pages workflows have not run on GitHub.
- Layout was checked with fixture data in a headless browser, not on real devices.
- Behavior against every kind of real account (very large accounts, accounts with no public events, repositories with many contributors) has not been tested.
- No screenshots or live demo have been published.

## Maintainer checklist

See `docs/MAINTAINER_GUIDE.fr.md` for the step-by-step version.

- [ ] Put the project files (not the zip) in the repository and confirm CI is green
- [ ] Rename the repository to `devtrack` (the current name starts with a hyphen)
- [ ] Enable private vulnerability reporting
- [ ] Add a real screenshot taken from the running app
- [ ] Enable GitHub Pages and run the demo workflow
- [ ] Create the labels and open the first issues from `docs/FIRST_ISSUES.md`
- [ ] Tag `v0.2.0` once CI is green
