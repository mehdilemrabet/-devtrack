import test from "node:test";
import assert from "node:assert/strict";
import { summarizeRepos, activityByDay, formatNumber } from "../src/metrics.js";

test("summarizeRepos totals stars, forks, and language counts", () => {
  const result = summarizeRepos([
    { stargazers_count: 10, forks_count: 2, language: "JavaScript" },
    { stargazers_count: 5, forks_count: 3, language: "JavaScript" },
    { stargazers_count: 1, forks_count: 0, language: "Python" },
    { stargazers_count: 0, forks_count: 0, language: null }
  ]);
  assert.equal(result.stars, 16);
  assert.equal(result.forks, 5);
  assert.equal(result.languageCount, 2);
  assert.deepEqual(result.languages, [["JavaScript", 2], ["Python", 1]]);
});

test("activityByDay counts events in the requested date window", () => {
  const now = new Date("2026-11-08T12:00:00Z");
  const events = [
    { created_at: "2026-11-08T08:00:00Z" },
    { created_at: "2026-11-07T08:00:00Z" },
    { created_at: "2026-10-01T08:00:00Z" }
  ];
  const result = activityByDay(events, 3, now);
  assert.deepEqual(result, [0, 1, 1]);
});

test("formatNumber handles missing values", () => {
  assert.equal(formatNumber(undefined), "0");
  assert.equal(formatNumber(42), "42");
});