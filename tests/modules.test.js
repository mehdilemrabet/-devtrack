import test from "node:test";
import assert from "node:assert/strict";
import { createCache } from "../src/cache.js";
import { buildReport, csvCell, reportToMarkdown, reposToCsv } from "../src/export.js";
import { escapeHtml, safeExternalUrl, safeUrl } from "../src/html.js";
import { activityByDay, eventWindow, formatNumber, languagePercents, summarizeEvents } from "../src/metrics.js";
import { href, parseRoute } from "../src/router.js";
import { isValidLanguage, isValidRepoName, isValidUsername, normalizeUsername } from "../src/validate.js";
import { makeRepo } from "./helpers.js";

test("parseRoute and href round-trip every route", () => {
  assert.deepEqual(parseRoute("").name, "home");
  assert.deepEqual(parseRoute(href.user("octo")), { name: "user", username: "octo", params: {} });
  assert.equal(parseRoute(href.org("github")).org, "github");
  const repo = parseRoute(href.repo("octo", "my.repo"));
  assert.deepEqual([repo.name, repo.owner, repo.repo], ["repo", "octo", "my.repo"]);
  assert.deepEqual([parseRoute(href.compare("a", "b")).a, parseRoute(href.compare("a", "b")).b], ["a", "b"]);
  assert.equal(parseRoute("#/compare").name, "compare");
  assert.deepEqual(parseRoute(href.trending({ language: "C#", days: 90 })).params, { language: "C#", days: "90" });
  assert.equal(parseRoute("#/nope/x").name, "notfound");
  assert.equal(parseRoute("#/u/%E0%A4%A").name, "user"); // malformed escapes do not throw
});

test("validation accepts real GitHub names and rejects dangerous input", () => {
  assert.ok(isValidUsername("torvalds") && isValidUsername("a-b"));
  for (const bad of ["", "-a", "a-", "a--b", "a/b", "a b", "x".repeat(40), "<script>"]) assert.equal(isValidUsername(bad), false, bad);
  assert.ok(isValidRepoName("my.repo_1-x"));
  for (const bad of ["", ".", "..", "a/b", "a b"]) assert.equal(isValidRepoName(bad), false, bad);
  assert.ok(isValidLanguage("") && isValidLanguage("C++") && isValidLanguage("Jupyter Notebook"));
  assert.equal(isValidLanguage("js\" OR stars:>1"), false);
  assert.equal(normalizeUsername("  @octo "), "octo");
});

test("escapeHtml and safeUrl block injection", () => {
  assert.equal(escapeHtml('<img src=x onerror="a">'), "&lt;img src=x onerror=&quot;a&quot;&gt;");
  assert.equal(safeUrl("javascript:alert(1)"), "#");
  assert.equal(safeUrl("https://evil.example/x"), "#");
  assert.equal(safeUrl("https://github.com/octo"), "https://github.com/octo");
  assert.equal(safeUrl("https://avatars.githubusercontent.com/u/1?v=4", ["avatars.githubusercontent.com"]), "https://avatars.githubusercontent.com/u/1?v=4");
  assert.equal(safeExternalUrl("http://insecure.example"), null);
  assert.equal(safeExternalUrl("https://ok.example/"), "https://ok.example/");
});

test("csvCell neutralizes spreadsheet formulas and escapes quotes", () => {
  assert.equal(csvCell("=HYPERLINK(\"x\")"), "\"'=HYPERLINK(\"\"x\"\")\"");
  assert.equal(csvCell("+1"), "'+1");
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell(null), "");
});

test("reposToCsv and reportToMarkdown produce complete exports", () => {
  const repos = [makeRepo({ name: "a|b", description: "=cmd" })];
  const csv = reposToCsv(repos);
  assert.match(csv.split("\r\n")[0], /^name,url,description,language,stars,forks/);
  assert.match(csv, /'=cmd/);
  const report = buildReport({ kind: "user", subject: "octo", summary: { stars: 10 }, repos, truncated: true, now: new Date("2026-11-08T00:00:00Z") });
  assert.equal(report.generatedAt, "2026-11-08T00:00:00.000Z");
  assert.ok(report.notes.length >= 3);
  const md = reportToMarkdown(report);
  assert.match(md, /# DevTrack report: octo/);
  assert.match(md, /a\\\|b/); // pipe escaped
  assert.match(md, /truncated/);
});

test("activityByDay uses UTC days and ignores bad dates", () => {
  const now = new Date("2026-11-08T23:30:00Z");
  const events = [{ created_at: "2026-11-08T00:05:00Z" }, { created_at: "2026-11-07T23:59:00Z" }, { created_at: "garbage" }];
  assert.deepEqual(activityByDay(events, 3, now), [0, 1, 1]);
});

test("summarizeEvents, eventWindow and languagePercents describe real data only", () => {
  const events = [{ type: "PushEvent", created_at: "2026-11-02T00:00:00Z" }, { type: "PushEvent", created_at: "2026-11-05T00:00:00Z" }, { type: "NewThingEvent", created_at: "2026-11-04T00:00:00Z" }];
  const summary = summarizeEvents(events);
  assert.deepEqual(summary[0], { type: "PushEvent", label: "Pushes", count: 2 });
  assert.equal(summary[1].label, "NewThingEvent"); // unknown types are shown as returned
  const window = eventWindow(events);
  assert.equal(window.count, 3);
  assert.equal(window.oldest.toISOString(), "2026-11-02T00:00:00.000Z");
  assert.equal(eventWindow([]), null);
  const pct = languagePercents({ JavaScript: 750, CSS: 250, Empty: 0 });
  assert.deepEqual(pct.map((p) => [p.name, p.percent]), [["JavaScript", 75], ["CSS", 25]]);
  assert.deepEqual(languagePercents(null), []);
  assert.equal(formatNumber(12500), "12.5K");
});

test("cache expires entries after the TTL and survives broken storage", () => {
  let time = 0;
  const cache = createCache({ ttlMs: 1000, storage: null, now: () => time });
  cache.set("k", { a: 1 });
  assert.deepEqual(cache.get("k"), { a: 1 });
  time = 1500;
  assert.equal(cache.get("k"), null);
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); }, removeItem() {}, key() { return null; }, length: 0 };
  const safe = createCache({ storage: broken });
  safe.set("x", 1);
  assert.equal(safe.get("x"), 1);
  safe.clear();
});
