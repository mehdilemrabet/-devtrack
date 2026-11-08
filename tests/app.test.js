// End-to-end style smoke tests: the real app code running in jsdom with a fake GitHub API.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { setCache } from "../src/api.js";
import { createCache } from "../src/cache.js";
import { startApp } from "../src/app.js";
import { fakeFetch, jsonResponse, makeRepo } from "./helpers.js";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function boot(hash = "") {
  const dom = new JSDOM(indexHtml, { url: `http://localhost/${hash}`, pretendToBeVisual: true });
  setCache(createCache({ storage: null }));
  const { document: doc, window: win } = dom.window;
  startApp(doc, win);
  return { doc, win, view: doc.getElementById("view") };
}

async function waitFor(check, label, timeout = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = check();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

const profileRoutes = (login, repos) => ({
  [`/users/${login}`]: { login, name: login.toUpperCase(), followers: login === "octo" ? 10 : 3, following: 1, public_repos: repos.length, created_at: "2020-01-01T00:00:00Z", html_url: `https://github.com/${login}`, avatar_url: "https://avatars.githubusercontent.com/u/1" },
  [`/users/${login}/repos`]: repos,
  [`/users/${login}/events/public`]: [{ type: "PushEvent", created_at: new Date().toISOString() }]
});

const repos = [
  makeRepo({ name: "alpha", language: "Python", stargazers_count: 5, description: "Data tools" }),
  makeRepo({ name: "beta", language: "JavaScript", stargazers_count: 50, description: "<img src=x onerror=alert(1)>" })
];

test("home screen renders navigation targets and no network call", async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return jsonResponse({}); };
  const { view, doc } = boot();
  assert.match(view.textContent, /Compare profiles/);
  assert.equal(doc.getElementById("hero").classList.contains("hidden"), false);
  assert.equal(called, false);
});

test("profile flow: search, stats, filters, show-more, and safe rendering", async () => {
  globalThis.fetch = fakeFetch(profileRoutes("octo", repos));
  const { doc, view, win } = boot();
  doc.getElementById("username-input").value = "@octo";
  doc.getElementById("search-form").dispatchEvent(new win.Event("submit", { cancelable: true, bubbles: true }));
  await waitFor(() => view.querySelector(".profile-name-line"), "profile header");
  assert.equal(win.location.hash, "#/u/octo");
  assert.match(view.textContent, /Total stars/);
  assert.equal(view.querySelectorAll("#repo-results .repo-item").length, 2);
  assert.equal(view.querySelector("#repo-results img"), null, "hostile description must not become an element");

  const search = view.querySelector('[data-filter="query"]');
  search.value = "data";
  search.dispatchEvent(new win.Event("input", { bubbles: true }));
  assert.equal(view.querySelectorAll("#repo-results .repo-item").length, 1);

  search.value = "zzz";
  search.dispatchEvent(new win.Event("input", { bubbles: true }));
  assert.match(view.querySelector("#repo-results").textContent, /No repositories match/);

  search.value = "";
  search.dispatchEvent(new win.Event("input", { bubbles: true }));
  const sort = view.querySelector('[data-filter="sort"]');
  sort.value = "stars";
  sort.dispatchEvent(new win.Event("input", { bubbles: true }));
  assert.match(view.querySelector("#repo-results .repo-title").textContent, /beta/);
});

test("export buttons download real JSON and CSV for the filtered list", async () => {
  globalThis.fetch = fakeFetch(profileRoutes("octo", repos));
  const { view, win } = boot("#/u/octo");
  await waitFor(() => view.querySelector(".export-bar"), "export bar");
  const files = [];
  const blobs = [];
  URL.createObjectURL = (blob) => { blobs.push(blob); return "blob:test"; };
  URL.revokeObjectURL = () => {};
  win.HTMLAnchorElement.prototype.click = function click() { files.push(this.download); };

  view.querySelector('[data-format="json"]').click();
  view.querySelector('[data-format="csv"]').click();
  assert.match(files[0], /^devtrack-octo-\d{4}-\d{2}-\d{2}\.json$/);
  assert.match(files[1], /\.csv$/);
  const report = JSON.parse(await blobs[0].text());
  assert.equal(report.kind, "user");
  assert.equal(report.repos.length, 2);
  assert.ok(report.notes.length > 0);
  const bytes = new Uint8Array(await blobs[1].arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], "CSV starts with a UTF-8 BOM so Excel reads accents correctly");
  assert.match(await blobs[1].text(), /^name,url/);
});

test("unknown users and rate limits show clear error states", async () => {
  globalThis.fetch = fakeFetch({});
  let { view } = boot("#/u/ghost");
  await waitFor(() => view.querySelector("[role=alert]"), "not found error");
  assert.match(view.textContent, /couldn't find that GitHub user/);

  globalThis.fetch = async () => jsonResponse({ message: "x" }, { status: 403, headers: { "x-ratelimit-remaining": "0" } });
  ({ view } = boot("#/u/octo"));
  await waitFor(() => view.querySelector("[role=alert]"), "rate limit error");
  assert.match(view.textContent, /rate limit/i);
  assert.ok(view.querySelector('[data-action="retry"]'));
});

test("invalid names are rejected before any request", async () => {
  let called = false;
  globalThis.fetch = async () => { called = true; return jsonResponse({}); };
  const { view } = boot("#/u/-bad");
  await waitFor(() => view.querySelector("[role=alert]"), "validation error");
  assert.match(view.textContent, /valid GitHub username/);
  assert.equal(called, false);
});

test("repository page shows health, languages and contributors", async () => {
  globalThis.fetch = fakeFetch({
    "/repos/octo/demo": makeRepo({ subscribers_count: 7 }),
    "/repos/octo/demo/languages": { JavaScript: 800, CSS: 200 },
    "/repos/octo/demo/contributors": [{ login: "octo", type: "User", contributions: 9, avatar_url: "https://avatars.githubusercontent.com/u/1", html_url: "https://github.com/octo" }],
    "/repos/octo/demo/releases/latest": { tag_name: "v1.0.0", html_url: "https://github.com/octo/demo/releases/tag/v1.0.0", published_at: "2026-10-01T00:00:00Z" }
  });
  const { view, doc } = boot("#/r/octo/demo");
  await waitFor(() => view.querySelector(".checklist"), "repo page");
  assert.match(view.textContent, /checks passed/);
  assert.match(view.textContent, /80\.0%/);
  assert.match(view.textContent, /v1\.0\.0/);
  assert.equal(doc.getElementById("hero").classList.contains("hidden"), true);
});

test("compare page highlights leaders from real fetched profiles", async () => {
  globalThis.fetch = fakeFetch({ ...profileRoutes("octo", repos), ...profileRoutes("hubot", [makeRepo({ name: "z" })]) });
  const { view } = boot("#/compare/octo/hubot");
  await waitFor(() => view.querySelector(".compare-table"), "compare table");
  const lead = view.querySelectorAll(".compare-table td.lead");
  assert.ok(lead.length > 0);
  assert.equal(view.querySelector(".compare-table tbody tr td").textContent, "10"); // octo followers
});

test("most-starred page queries the Search API with the chosen filters", async () => {
  const calls = [];
  globalThis.fetch = fakeFetch({ "/search/repositories": { total_count: 1, incomplete_results: false, items: [makeRepo({ full_name: "octo/hot" })] } }, calls);
  const { view } = boot("#/trending?language=Go&days=7");
  await waitFor(() => view.querySelector(".repo-item"), "results");
  assert.match(decodeURIComponent(calls[0]), /language:Go/);
  assert.match(view.textContent, /octo\/hot/);
  assert.match(view.textContent, /not GitHub's own Trending page/);
});
