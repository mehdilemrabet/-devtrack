// GitHub REST API client (public, unauthenticated, called from the browser).
// Only documented endpoints are used. No token is ever read, stored or sent.

import { createCache } from "./cache.js";

export const API_BASE = "https://api.github.com";
const DEFAULT_MAX_PAGES = 5;

let cache = createCache();
export function setCache(next) { cache = next; }
export function clearCache() { cache.clear(); }

const rate = { limit: null, remaining: null, resetAt: null };
const listeners = new Set();
export function getRateLimit() { return { ...rate }; }
export function onRateLimitChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function updateRate(headers) {
  const limit = headers.get("x-ratelimit-limit");
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");
  if (limit === null && remaining === null) return;
  rate.limit = limit === null ? null : Number(limit);
  rate.remaining = remaining === null ? null : Number(remaining);
  rate.resetAt = reset === null ? null : new Date(Number(reset) * 1000);
  listeners.forEach((listener) => listener(getRateLimit()));
}

export class GitHubError extends Error {
  constructor(message, { kind = "http", status = 0, resetAt = null } = {}) {
    super(message);
    this.name = "GitHubError";
    this.kind = kind;
    this.status = status;
    this.resetAt = resetAt;
  }
}

export function parseLinkHeader(header) {
  const links = {};
  if (!header) return links;
  for (const part of header.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="([^"]+)"/);
    if (match) links[match[2]] = match[1];
  }
  return links;
}

export function pageFromUrl(url) {
  try {
    return Number(new URL(url).searchParams.get("page")) || null;
  } catch {
    return null;
  }
}

async function requestRaw(path, { notFound = "GitHub could not find that resource." } = {}) {
  const cached = cache.get(path);
  if (cached) return cached;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }
    });
  } catch {
    throw new GitHubError("Could not reach GitHub. Check your connection and try again.", { kind: "network" });
  }
  updateRate(response.headers);

  if (response.status === 404) throw new GitHubError(notFound, { kind: "not_found", status: 404 });
  if (response.status === 403 || response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    if (response.headers.get("x-ratelimit-remaining") === "0" || retryAfter || response.status === 429) {
      const resetAt = rate.resetAt ?? (retryAfter ? new Date(Date.now() + Number(retryAfter) * 1000) : null);
      const when = resetAt ? resetAt.toLocaleTimeString() : "later";
      throw new GitHubError(`GitHub's public API rate limit was reached. Please try again after ${when}.`, { kind: "rate_limit", status: response.status, resetAt });
    }
    throw new GitHubError("GitHub refused this request (403). The data may not be publicly available.", { kind: "forbidden", status: 403 });
  }
  if (response.status === 422) throw new GitHubError("GitHub could not process that search. Check the filters and try again.", { kind: "invalid", status: 422 });
  if (!response.ok) throw new GitHubError(`GitHub returned an error (${response.status}). Please try again.`, { kind: "http", status: response.status });

  const data = response.status === 204 ? [] : await response.json();
  const result = { data, links: parseLinkHeader(response.headers.get("link")) };
  cache.set(path, result);
  return result;
}

async function request(path, options) {
  return (await requestRaw(path, options)).data;
}

// Follows the documented `Link: rel="next"` header, up to maxPages pages of 100 items.
async function paginate(path, { maxPages = DEFAULT_MAX_PAGES, notFound } = {}) {
  const separator = path.includes("?") ? "&" : "?";
  let next = `${path}${separator}per_page=100`;
  const items = [];
  let pages = 0;
  while (next && pages < maxPages) {
    const { data, links } = await requestRaw(next, { notFound });
    items.push(...data);
    pages += 1;
    next = links.next && links.next.startsWith(`${API_BASE}/`) ? links.next.slice(API_BASE.length) : null;
  }
  return { items, truncated: Boolean(next) };
}

// Counts items with per_page=1 and reads the last page number from the Link header.
async function countItems(path) {
  const { data, links } = await requestRaw(`${path}?per_page=1`);
  if (links.last) return pageFromUrl(links.last) ?? data.length;
  return data.length;
}

const settled = (result) => (result.status === "fulfilled" ? result.value : null);

export async function fetchProfile(username) {
  const name = encodeURIComponent(username.trim());
  const notFound = "We couldn't find that GitHub user. Check the spelling, or switch to Organization if it is an organization.";
  const [user, repoPage, eventPage] = await Promise.all([
    request(`/users/${name}`, { notFound }),
    paginate(`/users/${name}/repos?sort=updated&type=owner`, { notFound }),
    paginate(`/users/${name}/events/public`, { maxPages: 3, notFound })
  ]);
  return { user, repos: repoPage.items, events: eventPage.items, truncated: repoPage.truncated };
}

export async function fetchOrg(orgName) {
  const name = encodeURIComponent(orgName.trim());
  const notFound = "We couldn't find that organization. Check the spelling, or switch to Profile if it is a user.";
  const [org, repoPage] = await Promise.all([
    request(`/orgs/${name}`, { notFound }),
    paginate(`/orgs/${name}/repos?type=public&sort=updated`, { notFound })
  ]);
  return { org, repos: repoPage.items, truncated: repoPage.truncated };
}

export async function fetchRepoDetail(owner, repoName) {
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`;
  const repo = await request(base, { notFound: "We couldn't find that repository. It may be private, renamed or deleted." });
  const [languages, contributors, contributorCount, latestRelease] = (await Promise.allSettled([
    request(`${base}/languages`),
    request(`${base}/contributors?per_page=10`),
    countItems(`${base}/contributors`),
    request(`${base}/releases/latest`)
  ])).map(settled);
  // Optional parts are null when GitHub does not provide them (the UI says "unavailable").
  return { repo, languages, contributors, contributorCount, latestRelease };
}

// GitHub has no official "trending" API. This uses the documented Search API:
// repositories created in the last N days, sorted by stars.
export async function fetchMostStarred({ days = 30, language = "", now = new Date() } = {}) {
  const since = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
  let query = `created:>${since}`;
  if (language) query += language.includes(" ") ? ` language:"${language}"` : ` language:${language}`;
  const data = await request(`/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=20`);
  return { items: data.items ?? [], total: data.total_count ?? 0, incomplete: Boolean(data.incomplete_results), since };
}
