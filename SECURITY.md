# Security policy

## Supported versions

Only the latest release and the `main` branch receive security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately through GitHub: open the **Security** tab of this repository and choose **Report a vulnerability** (private vulnerability reporting). Include what you found, how to reproduce it, and the impact you expect.

You can expect an acknowledgement within a reasonable time. DevTrack is maintained by volunteers, so please allow some patience, and give us the opportunity to fix the problem before disclosing it publicly.

## Scope and design notes

DevTrack is a static, browser-only app. It has no server, no accounts and no database.

- It calls only the public GitHub REST API (`https://api.github.com`) without authentication.
- It never asks for, stores or sends access tokens. Contributions that add token handling need a dedicated security review first.
- All text from the API is HTML-escaped before display, and links and images are restricted to GitHub hosts (see `src/html.js`).
- Production builds ship a Content-Security-Policy (see `vite.config.js`).
- Cached API responses are kept only in the browser tab (`sessionStorage`).

Out of scope: vulnerabilities in GitHub itself, and issues that need a modified browser or a compromised device.
