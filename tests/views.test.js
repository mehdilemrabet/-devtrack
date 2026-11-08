import test from "node:test";
import assert from "node:assert/strict";
import { compareTableHtml, errorHtml, healthPanelHtml, orgPageHtml, repoPageHtml, trendingPageHtml, userPageHtml } from "../src/views.js";
import { repoHealth } from "../src/repos.js";
import { GitHubError } from "../src/api.js";
import { defaultFilters } from "../src/repos.js";
import { makeRepo } from "./helpers.js";

const evil = '<script>alert(1)</script>';
const state = () => ({ filters: defaultFilters(), visible: 20 });
const now = new Date("2026-11-08T12:00:00Z");

test("user page escapes hostile API data and drops unsafe links and images", () => {
  const data = {
    user: { login: "octo", name: evil, bio: evil, location: evil, avatar_url: "https://evil.example/a.png", html_url: "javascript:alert(1)", followers: 1, following: 2, public_repos: 1, created_at: "2020-01-01T00:00:00Z" },
    repos: [makeRepo({ name: "x", description: evil, html_url: "javascript:alert(2)", language: evil, license: { spdx_id: evil } })],
    events: [],
    truncated: false
  };
  const html = userPageHtml(data, state(), now);
  assert.ok(!html.includes("<script"), "no raw script tag");
  assert.ok(!html.includes("javascript:"), "no javascript: links");
  assert.ok(!html.includes("evil.example"), "no foreign image host");
  assert.match(html, /&lt;script&gt;/);
});

test("user page labels what the numbers mean and flags truncation", () => {
  const data = { user: { login: "octo", followers: 0, following: 0, public_repos: 700, created_at: "2020-01-01T00:00:00Z" }, repos: [makeRepo()], events: [], truncated: true };
  const html = userPageHtml(data, state(), now);
  assert.match(html, /more repositories than DevTrack loads/);
  assert.match(html, /public events/i);
  assert.match(html, /not an official GitHub metric|contribution graph/);
  assert.match(html, /GitHub returned no public events/);
});

test("organization pages are suggested for organization accounts", () => {
  const data = { user: { login: "acme", type: "Organization", followers: 0, following: 0, public_repos: 1, created_at: "2020-01-01T00:00:00Z" }, repos: [], events: [], truncated: false };
  assert.match(userPageHtml(data, state(), now), /#\/o\/acme/);
  const org = orgPageHtml({ org: { login: "acme", followers: 3, public_repos: 1, created_at: "2020-01-01T00:00:00Z" }, repos: [makeRepo({ owner: { login: "acme" } })], truncated: false }, state());
  assert.match(org, /Most starred repositories/);
  assert.match(org, /#\/r\/acme\/demo/);
});

test("repo page shows real data, marks unavailable parts, and never invents numbers", () => {
  const html = repoPageHtml({ repo: makeRepo({ subscribers_count: undefined }), languages: null, contributors: null, contributorCount: null, latestRelease: null }, now);
  assert.match(html, /Language data is unavailable/);
  assert.match(html, /contributor list is unavailable/);
  assert.match(html, /No published release/);
  assert.match(html, /Unavailable right now/);
  assert.match(html, /Open issues \+ PRs/);
  const ok = repoPageHtml({ repo: makeRepo(), languages: { JavaScript: 3, CSS: 1 }, contributors: [{ login: "a", type: "User", contributions: 5, avatar_url: "https://avatars.githubusercontent.com/u/1", html_url: "https://github.com/a" }, { login: "bot[bot]", type: "Bot", contributions: 2, html_url: "https://github.com/apps/bot" }], contributorCount: 2, latestRelease: { tag_name: "v1", html_url: "https://github.com/octo/demo/releases/v1", published_at: "2026-10-01T00:00:00Z" } }, now);
  assert.match(ok, /75\.0%/);
  assert.match(ok, /href="#\/u\/a"/);
  assert.ok(!ok.includes('href="#/u/bot'), "bots link to GitHub, not to an internal profile route");
});

test("health panel exposes pass/fail state to assistive technology", () => {
  const html = healthPanelHtml(repoHealth(makeRepo({ license: null }), now));
  assert.match(html, /Not met/);
  assert.match(html, /Passed/);
  assert.match(html, /role="img"/);
});

test("compare table highlights the leader per metric and leaves ties alone", () => {
  const mk = (login, followers, stars) => ({ user: { login, followers, following: 1, public_repos: 1, created_at: "2020-01-01T00:00:00Z" }, repos: [makeRepo({ stargazers_count: stars })], events: [] });
  const html = compareTableHtml(mk("a", 10, 5), mk("b", 3, 5), now);
  assert.match(html, /<td class="lead">10<\/td><td class="">3<\/td>/); // followers: a leads
  assert.match(html, /<td class="">5<\/td><td class="">5<\/td>/); // stars tie
  assert.match(html, /not a quality judgment/);
});

test("trending page explains it is not GitHub's Trending page", () => {
  const html = trendingPageHtml("Go", 30, { items: [makeRepo()], total: 1234, incomplete: true, since: "2026-10-09" });
  assert.match(html, /not GitHub's own Trending page/);
  assert.match(html, /incomplete/);
  assert.match(html, /octo\/demo/);
});

test("error panel is announced and offers a retry", () => {
  const html = errorHtml(new GitHubError("Boom <b>", { kind: "rate_limit" }));
  assert.match(html, /role="alert"/);
  assert.match(html, /GitHub rate limit reached/);
  assert.match(html, /Boom &lt;b&gt;/);
  assert.match(html, /data-action="retry"/);
});
