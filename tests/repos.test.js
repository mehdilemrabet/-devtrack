import test from "node:test";
import assert from "node:assert/strict";
import { applyFilters, filterRepos, listLanguages, repoHealth, sortRepos } from "../src/repos.js";
import { makeRepo } from "./helpers.js";

const repos = [
  makeRepo({ name: "alpha", stargazers_count: 5, language: "Python", description: "Data tools", updated_at: "2026-01-01T00:00:00Z" }),
  makeRepo({ name: "beta", stargazers_count: 50, language: "JavaScript", fork: true, updated_at: "2026-03-01T00:00:00Z" }),
  makeRepo({ name: "gamma", stargazers_count: 20, language: "Python", archived: true, topics: ["cli"], updated_at: "2026-02-01T00:00:00Z" })
];

test("sortRepos sorts by stars, name and recent update without mutating input", () => {
  assert.deepEqual(sortRepos(repos, "stars").map((r) => r.name), ["beta", "gamma", "alpha"]);
  assert.deepEqual(sortRepos(repos, "name").map((r) => r.name), ["alpha", "beta", "gamma"]);
  assert.deepEqual(sortRepos(repos, "updated").map((r) => r.name), ["beta", "gamma", "alpha"]);
  assert.deepEqual(repos.map((r) => r.name), ["alpha", "beta", "gamma"]);
});

test("filterRepos matches name, description and topics", () => {
  assert.deepEqual(filterRepos(repos, { query: "data" }).map((r) => r.name), ["alpha"]);
  assert.deepEqual(filterRepos(repos, { query: "CLI" }).map((r) => r.name), ["gamma"]);
  assert.deepEqual(filterRepos(repos, { query: "nothing-matches" }), []);
});

test("filterRepos handles language, forks and archived toggles", () => {
  assert.deepEqual(filterRepos(repos, { language: "Python" }).map((r) => r.name), ["alpha", "gamma"]);
  assert.deepEqual(filterRepos(repos, { forks: false }).map((r) => r.name), ["alpha", "gamma"]);
  assert.deepEqual(filterRepos(repos, { archived: false }).map((r) => r.name), ["alpha", "beta"]);
});

test("applyFilters combines filtering and sorting; listLanguages is unique and sorted", () => {
  assert.deepEqual(applyFilters(repos, { language: "Python", sort: "stars" }).map((r) => r.name), ["gamma", "alpha"]);
  assert.deepEqual(listLanguages(repos), ["JavaScript", "Python"]);
});

test("repoHealth scores only fields GitHub returned", () => {
  const now = new Date("2026-11-08T00:00:00Z");
  const healthy = repoHealth(makeRepo(), now);
  assert.equal(healthy.score, healthy.max);
  assert.equal(healthy.max, 6);

  const weak = repoHealth(makeRepo({ license: null, description: "", topics: [], archived: true, pushed_at: "2025-01-01T00:00:00Z" }), now);
  assert.equal(weak.score, 1); // only "issues enabled" passes
  assert.equal(weak.checks.find((c) => c.id === "recent-push").passed, false);

  const partial = repoHealth({ name: "x", pushed_at: "2026-11-01T00:00:00Z" }, now);
  assert.equal(partial.checks.find((c) => c.id === "license").passed, null);
  assert.equal(partial.max, 1); // only the push date is known; unknown checks are not scored
});
