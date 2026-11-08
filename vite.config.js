import { defineConfig } from "vite";

// Content-Security-Policy is injected for production builds only,
// because the dev server needs inline scripts and websockets for hot reload.
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: https://avatars.githubusercontent.com",
  "connect-src https://api.github.com",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'"
].join("; ");

export default defineConfig({
  // Relative base so the build works on GitHub Pages under /<repo-name>/ and anywhere else.
  base: "./",
  plugins: [
    {
      name: "devtrack-csp",
      transformIndexHtml(html, ctx) {
        if (ctx.server) return html;
        return html.replace("<head>", `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`);
      }
    }
  ]
});
