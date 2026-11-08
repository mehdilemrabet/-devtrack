import test from "node:test";
import assert from "node:assert/strict";
import { GitHubError, fetchMostStarred, fetchOrg, fetchProfile, fetchRepoDetail, getRateLimit, pageFromUrl, parseLinkHeader, setCache } from "../src/api.js";
import { createCache } from "../src/cache.js";
import { fakeFetch, jsonResponse, makeRepo } from "./helpers.js";

test.beforeEach(() => setCache(createCache({ storage: null })));

test("parseLinkHeader and pageFromUrl read GitHub pagination links", () => {
  const links = parseLinkHeader('<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=9>; rel="last"');
  assert.equal(links.next, "https://api.github.com/x?page=2");
  assert.equal(pageFromUrl(links.last), 9);
  assert.deepEqual(parseLinkHeader(null), {});
});

test("fetchProfile follows pagination and reports the data it loaded", async () => {
  const calls = [];
  globalThis.fetch = fakeFetch({
    "/users/octo": { login: "octo", public_repos: 3 },
    "/users/octo/repos": (path) => path.includes("page=2")
      ? jsonResponse([makeRepo({ name: "c" })])
      : jsonResponse([makeRepo({ name: "a" }), makeRepo({ name: "b" })], { headers: { link: '<https://api.github.com/users/octo/repos?sort=updated&type=owner&per_page=100&page=2>; rel="next"' } }),
    "/users/octo/events/public": []
  }, calls);
  const data = await fetchProfile("octo");
  assert.deepEqual(data.repos.map((r) => r.name), ["a", "b", "c"]);
  assert.equal(data.truncated, false);
  assert.ok(calls.some((c) => c.includes("page=2")));
});

test("fetchProfile never follows next links that point to another host", async () => {
  const calls = [];
  globalThis.fetch = fakeFetch({
    "/users/octo": { login: "octo" },
    "/users/octo/repos": () => jsonResponse([makeRepo()], { headers: { link: '<https://evil.example/steal?page=2>; rel="next"' } }),
    "/users/octo/events/public": []
  }, calls);
  const data = await fetchProfile("octo");
  assert.equal(data.repos.length, 1);
  assert.ok(calls.every((c) => c.startsWith("/")));
});

test("pagination is capped and flagged as truncated", async () => {
  globalThis.fetch = fakeFetch({
    "/users/big": { login: "big" },
    "/users/big/repos": () => jsonResponse([makeRepo()], { headers: { link: '<https://api.github.com/users/big/repos?page=2>; rel="next"' } }),
    "/users/big/events/public": []
  });
  const data = await fetchProfile("big");
  assert.equal(data.repos.length, 5); // 5 pages x 1 item in this fake
  assert.equal(data.truncated, true);
});

test("404 becomes a not_found GitHubError with a helpful message", async () => {
  globalThis.fetch = fakeFetch({});
  await assert.rejects(fetchProfile("ghost"), (error) => error instanceof GitHubError && error.kind === "not_found" && /couldn't find/.test(error.message));
  await assert.rejects(fetchOrg("ghost"), (error) => error.kind === "not_found" && /organization/.test(error.message));
});

test("rate limit responses are detected and tracked", async () => {
  const reset = String(Math.floor(Date.now() / 1000) + 600);
  globalThis.fetch = async () => jsonResponse({ message: "rate limited" }, { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-limit": "60", "x-ratelimit-reset": reset } });
  await assert.rejects(fetchProfile("octo"), (error) => error.kind === "rate_limit" && error.resetAt instanceof Date);
  assert.equal(getRateLimit().remaining, 0);
  assert.equal(getRateLimit().limit, 60);
});

test("a 403 that is not a rate limit is reported as forbidden", async () => {
  globalThis.fetch = async () => jsonResponse({ message: "nope" }, { status: 403, headers: { "x-ratelimit-remaining": "42" } });
  await assert.rejects(fetchProfile("octo"), (error) => error.kind === "forbidden");
});

test("network failures become network errors", async () => {
  globalThis.fetch = async () => { throw new TypeError("offline"); };
  await assert.rejects(fetchProfile("octo"), (error) => error.kind === "network");
});

test("responses are cached so repeated lookups do not hit the API again", async () => {
  const calls = [];
  globalThis.fetch = fakeFetch({ "/users/octo": { login: "octo" }, "/users/octo/repos": [], "/users/octo/events/public": [] }, calls);
  await fetchProfile("octo");
  const first = calls.length;
  await fetchProfile("octo");
  assert.equal(calls.length, first);
});

test("fetchRepoDetail counts contributors from the Link header and tolerates missing optional data", async () => {
  globalThis.fetch = fakeFetch({
    "/repos/octo/demo": makeRepo(),
    "/repos/octo/demo/languages": { JavaScript: 900, CSS: 100 },
    "/repos/octo/demo/contributors": (path) => path.includes("per_page=1&") || path.endsWith("per_page=1")
      ? jsonResponse([{ login: "a" }], { headers: { link: '<https://api.github.com/repositories/1/contributors?per_page=1&page=37>; rel="last"' } })
      : jsonResponse([{ login: "a", contributions: 5 }])
    // no /releases/latest route -> 404 -> null
  });
  const detail = await fetchRepoDetail("octo", "demo");
  assert.equal(detail.contributorCount, 37);
  assert.deepEqual(detail.languages, { JavaScript: 900, CSS: 100 });
  assert.equal(detail.latestRelease, null);
});

test("fetchMostStarred builds a documented search query without inventing endpoints", async () => {
  const calls = [];
  globalThis.fetch = fakeFetch({ "/search/repositories": { total_count: 1, incomplete_results: false, items: [makeRepo()] } }, calls);
  const result = await fetchMostStarred({ days: 7, language: "C++", now: new Date("2026-11-08T00:00:00Z") });
  assert.equal(result.since, "2026-11-01");
  const url = decodeURIComponent(calls[0]);
  assert.match(url, /q=created:>2026-11-01 language:C\+\+/);
  assert.match(url, /sort=stars&order=desc&per_page=20/);
});
