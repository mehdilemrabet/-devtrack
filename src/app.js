// DOM wiring: routing, events, loading/error states, exports.
// All HTML is produced by views.js; this file only connects it to the page.

import { GitHubError, clearCache, fetchMostStarred, fetchOrg, fetchProfile, fetchRepoDetail, getRateLimit, onRateLimitChange } from "./api.js";
import { buildReport, reportToMarkdown, reposToCsv } from "./export.js";
import { summarizeRepos } from "./metrics.js";
import { applyFilters, defaultFilters } from "./repos.js";
import { href, parseRoute } from "./router.js";
import { isValidLanguage, isValidRepoName, isValidUsername, normalizeUsername } from "./validate.js";
import {
  COMPARE_METRICS, DAY_OPTIONS, PAGE_SIZE, comparePageHtml, compareRows, errorHtml, homeHtml, loadingHtml,
  notFoundHtml, orgPageHtml, repoPageHtml, repoResultsHtml, trendingPageHtml, userPageHtml
} from "./views.js";

const slug = (text) => String(text).replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "report";
const invalid = (message) => new GitHubError(message, { kind: "invalid" });

export function startApp(doc = document, win = window) {
  const $ = (id) => doc.getElementById(id);
  const view = $("view");
  const hero = $("hero");
  const form = $("search-form");
  const input = $("username-input");
  const kindSelect = $("search-kind");
  const button = $("search-button");
  const message = $("message");
  const rateEl = $("rate-status");
  const navLinks = [...doc.querySelectorAll("[data-nav]")];

  let navId = 0;
  let firstRoute = true; // do not move focus on the very first load, so the skip link stays first in tab order
  let current = null; // state of the screen being shown (filters, report builder...)

  function setMessage(text = "", type = "") {
    message.textContent = text;
    message.className = `message ${type}`.trim();
  }

  function setLoading(loading) {
    button.disabled = loading;
    button.innerHTML = loading ? '<span class="spinner"></span> Loading…' : 'Explore <span aria-hidden="true">→</span>';
  }

  function showRate(rate) {
    if (rate.remaining === null || rate.limit === null) {
      rateEl.querySelector("span").textContent = "GitHub API";
      rateEl.removeAttribute("data-low");
      return;
    }
    rateEl.querySelector("span").textContent = `${rate.remaining}/${rate.limit} API requests left`;
    if (rate.remaining <= 5) rateEl.setAttribute("data-low", "true");
    else rateEl.removeAttribute("data-low");
  }
  onRateLimitChange(showRate);
  showRate(getRateLimit());

  function navigateTo(hash) {
    if (win.location.hash === hash) route();
    else win.location.hash = hash;
  }

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = doc.createElement("a");
    link.href = url;
    link.download = filename;
    doc.body.appendChild(link);
    link.click();
    link.remove();
    win.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportCurrent(format) {
    if (!current) return;
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `devtrack-${slug(current.subject)}-${stamp}`;
    if (format === "json") download(`${base}.json`, JSON.stringify(current.report(), null, 2), "application/json");
    else if (format === "md") download(`${base}.md`, reportToMarkdown(current.report()), "text/markdown");
    else if (format === "csv" && current.csv) download(`${base}.csv`, `\uFEFF${current.csv()}`, "text/csv");
  }

  function updateResults() {
    const target = $("repo-results");
    if (!target || !current?.data) return;
    const matches = applyFilters(current.data.repos, current.filters);
    target.innerHTML = repoResultsHtml({ matches, visible: current.visible, total: current.data.repos.length, truncated: current.data.truncated });
  }

  /* ---------- screens ---------- */

  const loaders = {
    async user(r, id) {
      if (!isValidUsername(r.username)) throw invalid("Please enter a valid GitHub username.");
      const data = await fetchProfile(r.username);
      if (id !== navId) return;
      const metrics = summarizeRepos(data.repos);
      current = {
        subject: data.user.login,
        data,
        filters: defaultFilters(),
        visible: PAGE_SIZE,
        report: () => buildReport({
          kind: "user",
          subject: data.user.login,
          summary: { followers: data.user.followers, following: data.user.following, public_repositories: data.user.public_repos, total_stars_loaded_repos: metrics.stars, total_forks_loaded_repos: metrics.forks, distinct_languages: metrics.languageCount },
          repos: applyFilters(data.repos, current.filters),
          truncated: data.truncated
        }),
        csv: () => reposToCsv(applyFilters(data.repos, current.filters))
      };
      view.innerHTML = userPageHtml(data, current);
      doc.title = `${data.user.login} · DevTrack`;
    },

    async org(r, id) {
      if (!isValidUsername(r.org)) throw invalid("Please enter a valid GitHub organization name.");
      const data = await fetchOrg(r.org);
      if (id !== navId) return;
      const metrics = summarizeRepos(data.repos);
      current = {
        subject: data.org.login,
        data,
        filters: defaultFilters(),
        visible: PAGE_SIZE,
        report: () => buildReport({
          kind: "organization",
          subject: data.org.login,
          summary: { followers: data.org.followers, public_repositories: data.org.public_repos, total_stars_loaded_repos: metrics.stars, total_forks_loaded_repos: metrics.forks, distinct_languages: metrics.languageCount },
          repos: applyFilters(data.repos, current.filters),
          truncated: data.truncated
        }),
        csv: () => reposToCsv(applyFilters(data.repos, current.filters))
      };
      view.innerHTML = orgPageHtml(data, current);
      doc.title = `${data.org.login} · DevTrack`;
    },

    async repo(r, id) {
      if (!isValidUsername(r.owner) || !isValidRepoName(r.repo)) throw invalid("That repository address is not valid.");
      const detail = await fetchRepoDetail(r.owner, r.repo);
      if (id !== navId) return;
      current = {
        subject: detail.repo.full_name.replace("/", "-"),
        report: () => buildReport({
          kind: "repository",
          subject: detail.repo.full_name,
          summary: { stars: detail.repo.stargazers_count, forks: detail.repo.forks_count, watchers: detail.repo.subscribers_count ?? "unavailable", open_issues_incl_prs: detail.repo.open_issues_count, contributors: detail.contributorCount ?? "unavailable", primary_language: detail.repo.language ?? "none", license: detail.repo.license?.spdx_id ?? "none", last_push: detail.repo.pushed_at },
          repos: [detail.repo],
          extra: { languages_bytes: detail.languages, latest_release: detail.latestRelease ? { tag: detail.latestRelease.tag_name, published_at: detail.latestRelease.published_at } : null }
        })
      };
      view.innerHTML = repoPageHtml(detail);
      doc.title = `${detail.repo.full_name} · DevTrack`;
    },

    async compare(r, id) {
      const a = normalizeUsername(r.a);
      const b = normalizeUsername(r.b);
      doc.title = "Compare profiles · DevTrack";
      if (!a || !b) {
        view.innerHTML = comparePageHtml(a, b, null, null);
        return;
      }
      if (!isValidUsername(a) || !isValidUsername(b)) throw invalid("Both names must be valid GitHub usernames.");
      const [left, right] = await Promise.all([fetchProfile(a), fetchProfile(b)]);
      if (id !== navId) return;
      const rowsA = compareRows(left);
      const rowsB = compareRows(right);
      current = {
        subject: `${left.user.login}-vs-${right.user.login}`,
        report: () => buildReport({
          kind: "comparison",
          subject: `${left.user.login} vs ${right.user.login}`,
          summary: Object.fromEntries(COMPARE_METRICS.flatMap((m) => [[`${m.label} (${left.user.login})`, rowsA[m.key]], [`${m.label} (${right.user.login})`, rowsB[m.key]]])),
          truncated: left.truncated || right.truncated
        })
      };
      view.innerHTML = comparePageHtml(left.user.login, right.user.login, left, right);
    },

    async trending(r, id) {
      const language = (r.params.language || "").trim();
      const days = DAY_OPTIONS.includes(Number(r.params.days)) ? Number(r.params.days) : 30;
      if (!isValidLanguage(language)) throw invalid("That language name is not valid.");
      doc.title = "Most starred new repositories · DevTrack";
      const result = await fetchMostStarred({ days, language });
      if (id !== navId) return;
      view.innerHTML = trendingPageHtml(language, days, result);
    }
  };

  async function route() {
    const id = ++navId;
    const r = parseRoute(win.location.hash);
    const showsSearch = ["home", "user", "org"].includes(r.name);
    hero.classList.toggle("hidden", !showsSearch);
    for (const link of navLinks) {
      const active = link.dataset.nav === r.name || (link.dataset.nav === "home" && ["user", "org", "repo"].includes(r.name));
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    current = null;
    setLoading(false);

    if (r.name === "home") {
      view.innerHTML = homeHtml();
      doc.title = "DevTrack — Your GitHub, in focus";
      firstRoute = false;
      return;
    }
    if (r.name === "notfound") {
      view.innerHTML = notFoundHtml();
      doc.title = "Page not found · DevTrack";
      return;
    }

    const searching = r.name === "user" || r.name === "org";
    if (searching) {
      kindSelect.value = r.name === "org" ? "org" : "user";
      input.value = r.username ?? r.org;
      setLoading(true);
    }
    view.innerHTML = loadingHtml();
    try {
      await loaders[r.name](r, id);
      if (id === navId && searching) {
        setMessage(`Showing public data for ${current?.subject ?? input.value}.`, "success");
        const reduce = win.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        view.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
    } catch (error) {
      if (id === navId) {
        view.innerHTML = errorHtml(error instanceof GitHubError ? error : new GitHubError("Something went wrong. Please try again."));
        if (searching) setMessage("");
      }
    } finally {
      if (id === navId) {
        setLoading(false);
        if (!firstRoute) view.focus?.({ preventScroll: true });
        firstRoute = false;
      }
    }
  }

  /* ---------- events ---------- */

  function goSearch(rawName, kind) {
    const name = normalizeUsername(rawName);
    if (!name) {
      setMessage("Enter a GitHub username to get started.", "error");
      input.focus();
      return;
    }
    if (!isValidUsername(name)) {
      setMessage("Please enter a valid GitHub username.", "error");
      return;
    }
    setMessage("");
    navigateTo(kind === "org" ? href.org(name) : href.user(name));
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    goSearch(input.value, kindSelect.value);
  });

  doc.querySelectorAll(".example-user").forEach((el) => {
    el.addEventListener("click", () => {
      input.value = el.textContent;
      kindSelect.value = "user";
      goSearch(el.textContent, "user");
    });
  });

  view.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !view.contains(target)) return;
    const { action, format } = target.dataset;
    if (action === "retry") route();
    else if (action === "refresh") { clearCache(); route(); }
    else if (action === "more" && current?.data) { current.visible += PAGE_SIZE; updateResults(); }
    else if (action === "export") exportCurrent(format);
  });

  view.addEventListener("input", (event) => {
    const el = event.target.closest?.("[data-filter]");
    if (!el || !current?.filters) return;
    current.filters[el.dataset.filter] = el.type === "checkbox" ? el.checked : el.value;
    current.visible = PAGE_SIZE;
    updateResults();
  });

  view.addEventListener("submit", (event) => {
    const f = event.target;
    if (f.id === "compare-form") {
      event.preventDefault();
      const a = normalizeUsername(f.elements.a.value);
      const b = normalizeUsername(f.elements.b.value);
      const out = $("compare-message");
      if (!a || !b) { out.textContent = "Enter two GitHub usernames."; out.className = "message error"; return; }
      if (!isValidUsername(a) || !isValidUsername(b)) { out.textContent = "Both names must be valid GitHub usernames."; out.className = "message error"; return; }
      navigateTo(href.compare(a, b));
    } else if (f.id === "trending-form") {
      event.preventDefault();
      const language = f.elements.language.value.trim();
      const days = Number(f.elements.days.value);
      const out = $("trending-message");
      if (!isValidLanguage(language)) { out.textContent = "That language name is not valid."; out.className = "message error"; return; }
      navigateTo(href.trending({ language, days }));
    }
  });

  win.addEventListener("hashchange", route);
  route();
  return { route };
}
