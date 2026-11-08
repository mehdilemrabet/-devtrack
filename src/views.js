// HTML builders for every screen. They return strings and never touch the DOM,
// so they can be tested in Node. Every dynamic value goes through escapeHtml/safeUrl.

import { escapeHtml as esc, safeUrl, safeExternalUrl, AVATAR_HOSTS } from "./html.js";
import { activityByDay, eventWindow, formatDate, formatNumber, languagePercents, summarizeEvents, summarizeRepos, sum } from "./metrics.js";
import { SORT_OPTIONS, applyFilters, listLanguages, repoHealth } from "./repos.js";
import { href } from "./router.js";
import { isValidUsername } from "./validate.js";

export const LANGUAGE_COLORS = ["#8b7cff", "#4fd1b5", "#f6bd60", "#f28482", "#67a7ff", "#c792ea", "#9ca3af", "#e8a0bf"];
export const PAGE_SIZE = 20;
export const DAY_OPTIONS = [7, 30, 90];
const color = (index) => LANGUAGE_COLORS[index % LANGUAGE_COLORS.length];
const ext = 'target="_blank" rel="noopener noreferrer"';

export function loadingHtml(text = "Loading…") {
  return `<div class="state-panel" role="status"><span class="spinner"></span> ${esc(text)}</div>`;
}

const ERROR_TITLES = {
  rate_limit: "GitHub rate limit reached",
  not_found: "Nothing found",
  network: "Connection problem",
  invalid: "Check your input",
  forbidden: "Data not available"
};

export function errorHtml(error) {
  const title = ERROR_TITLES[error?.kind] || "Something went wrong";
  const message = error?.message || "Something went wrong. Please try again.";
  return `<div class="state-panel state-error" role="alert"><strong>${esc(title)}</strong><p>${esc(message)}</p><div class="state-actions"><button type="button" class="btn" data-action="retry">Try again</button><a class="btn btn-ghost" href="${href.home()}">Back to start</a></div></div>`;
}

export function homeHtml() {
  return `<section class="feature-grid" aria-label="What DevTrack shows">
    <article class="feature-card"><h3>Profile &amp; organization analytics</h3><p>Repositories, stars, forks, language mix and recent public activity for any public account.</p></article>
    <article class="feature-card"><h3>Repository pages</h3><p>Open any repository for a health checklist, language breakdown, top contributors and its latest release.</p></article>
    <a class="feature-card" href="${href.compare()}"><h3>Compare profiles →</h3><p>Put two GitHub profiles side by side and see where each one leads.</p></a>
    <a class="feature-card" href="${href.trending()}"><h3>Most starred new repositories →</h3><p>Repositories created recently, ranked by stars, with an optional language filter.</p></a>
  </section>
  <p class="data-note">DevTrack reads public data from the GitHub REST API. Public events, repository metrics and the contribution graph are different things; each screen says which one it shows. No account sign-in and no token are used.</p>`;
}

export function notFoundHtml() {
  return `<div class="state-panel"><strong>Page not found</strong><p>That address does not match a DevTrack page.</p><div class="state-actions"><a class="btn" href="${href.home()}">Back to start</a></div></div>`;
}

/* ---------- shared pieces ---------- */

export function avatarHtml(url, label, className = "avatar", size = 66) {
  const src = safeUrl(url, AVATAR_HOSTS, "");
  return src ? `<img class="${className}" src="${esc(src)}" alt="${esc(label)}" width="${size}" height="${size}" loading="lazy">` : "";
}

export function profileHeaderHtml(entity, { showFollowing = true } = {}) {
  const about = entity.bio ?? entity.description;
  return `<div class="profile-row">
    <div class="profile-main">
      ${avatarHtml(entity.avatar_url, `${entity.login}'s avatar`)}
      <div>
        <div class="profile-name-line"><h2>${esc(entity.name || entity.login)}</h2><span class="handle">@${esc(entity.login)}</span></div>
        <p class="bio">${esc(about || "No description provided.")}</p>
        <div class="profile-meta">${entity.location ? `<span>⌖ ${esc(entity.location)}</span>` : ""}<a href="${esc(safeUrl(entity.html_url))}" ${ext}>View on GitHub ↗</a></div>
      </div>
    </div>
    <div class="profile-follow"><div><strong>${formatNumber(entity.followers)}</strong><span>Followers</span></div>${showFollowing ? `<div><strong>${formatNumber(entity.following)}</strong><span>Following</span></div>` : ""}</div>
  </div>`;
}

export function statsHtml(cards, className = "stats-grid") {
  return `<div class="${className}">${cards.map((card) => `<article class="stat-card"><div class="stat-top"><span>${esc(card.label)}</span><span class="stat-icon" aria-hidden="true">${esc(card.icon || "")}</span></div><strong>${esc(card.value)}</strong><small>${esc(card.hint || "")}</small></article>`).join("")}</div>`;
}

export function languageBarHtml(items, summaryLabel) {
  // items: [{ name, share (0-100), label }]
  const bar = items.map((item, i) => `<span title="${esc(item.label)}" style="width:${item.share.toFixed(2)}%;background:${color(i)}"></span>`).join("");
  const legend = items.slice(0, 8).map((item, i) => `<span class="legend-item"><i style="background:${color(i)}"></i>${esc(item.name)} <b>${esc(item.value)}</b></span>`).join("");
  return `<div class="language-chart"><div class="language-bar" role="img" aria-label="${esc(summaryLabel)}">${bar}</div></div><div class="language-legend">${legend}</div>`;
}

export function languagePanelHtml(languages) {
  const body = languages.length
    ? (() => {
        const total = sum(languages.map(([, count]) => count));
        const items = languages.map(([name, count]) => ({ name, share: (count / total) * 100, value: count, label: `${name}: ${count} repositories` }));
        return languageBarHtml(items, `Language mix by repository count: ${languages.slice(0, 5).map(([n, c]) => `${n} ${c}`).join(", ")}`);
      })()
    : '<p class="empty-state">No language data available for this account yet.</p>';
  return `<article class="panel language-panel"><div class="panel-heading"><div><span class="section-kicker">TECH STACK</span><h3>Language mix</h3></div><span class="panel-note">By repository count (primary language)</span></div>${body}</article>`;
}

export function activityPanelHtml(events, now = new Date()) {
  const counts = activityByDay(events, 30, now);
  const total = sum(counts);
  const max = Math.max(1, ...counts);
  const startMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29);
  const bars = counts.map((count, i) => {
    const day = new Date(startMs + i * 86400000).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
    const height = Math.max(4, (count / max) * 100);
    return `<span class="activity-bar ${count ? "has-activity" : ""}" style="height:${height}%" title="${count} public event${count === 1 ? "" : "s"} · ${esc(day)}"></span>`;
  }).join("");
  const span = eventWindow(events);
  const types = summarizeEvents(events).slice(0, 6).map((item) => `<span class="legend-item">${esc(item.label)} <b>${item.count}</b></span>`).join("");
  const coverage = span
    ? `GitHub returned ${span.count} public events, the oldest from ${formatDate(span.oldest)}. The events feed only covers recent activity (about 90 days, a few hundred events at most).`
    : "GitHub returned no public events for this account.";
  return `<article class="panel activity-panel"><div class="panel-heading"><div><span class="section-kicker">RECENT MOMENTUM</span><h3>Public activity</h3></div><span class="panel-note">Last 30 days (UTC) · ${total} public event${total === 1 ? "" : "s"}</span></div>
    <div class="activity-chart" role="img" aria-label="Public events per day over the last 30 days: ${total} in total">${bars}</div>
    <div class="chart-foot"><span>30 days ago</span><span>Today</span></div>
    ${types ? `<div class="language-legend event-types">${types}</div>` : ""}
    <p class="data-note">${esc(coverage)} These are public events, not the contribution graph shown on a GitHub profile, and private contributions are not included.</p></article>`;
}

/* ---------- repository lists ---------- */

export function repoItemHtml(repo, { showOwner = false } = {}) {
  const owner = repo.owner?.login || (repo.full_name || "").split("/")[0] || "";
  const internal = owner ? href.repo(owner, repo.name) : href.home();
  const title = showOwner ? repo.full_name || repo.name : repo.name;
  const tags = [
    repo.language ? `<span><i class="language-dot"></i>${esc(repo.language)}</span>` : "",
    repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION" ? `<span>${esc(repo.license.spdx_id)}</span>` : "",
    repo.fork ? "<span>Fork</span>" : "",
    repo.archived ? "<span>Archived</span>" : ""
  ].join("");
  return `<article class="repo-item">
    <div class="repo-main">
      <div class="repo-title-line"><a class="repo-title" href="${esc(internal)}">${esc(title)}</a><a class="external" href="${esc(safeUrl(repo.html_url))}" ${ext} aria-label="Open ${esc(repo.name)} on GitHub">↗</a></div>
      <p>${esc(repo.description || "No description provided.")}</p>
      <div class="repo-tags">${tags}</div>
    </div>
    <div class="repo-stats"><span title="Stars">✳ ${formatNumber(repo.stargazers_count)}</span><span title="Forks">⑂ ${formatNumber(repo.forks_count)}</span><small>Updated ${formatDate(repo.updated_at)}</small></div>
  </article>`;
}

export function repoControlsHtml(languages, filters) {
  const languageOptions = ['<option value="">All languages</option>', ...languages.map((l) => `<option value="${esc(l)}"${filters.language === l ? " selected" : ""}>${esc(l)}</option>`)].join("");
  const sortOptions = SORT_OPTIONS.map(([value, label]) => `<option value="${value}"${filters.sort === value ? " selected" : ""}>${esc(label)}</option>`).join("");
  return `<div class="controls" role="search" aria-label="Filter repositories">
    <label class="field field-grow"><span>Search</span><input type="search" data-filter="query" value="${esc(filters.query)}" placeholder="Name, description or topic" autocomplete="off"></label>
    <label class="field"><span>Language</span><select data-filter="language">${languageOptions}</select></label>
    <label class="field"><span>Sort by</span><select data-filter="sort">${sortOptions}</select></label>
    <label class="check-field"><input type="checkbox" data-filter="forks"${filters.forks ? " checked" : ""}> Forks</label>
    <label class="check-field"><input type="checkbox" data-filter="archived"${filters.archived ? " checked" : ""}> Archived</label>
  </div>`;
}

export function repoResultsHtml({ matches, visible, total, truncated }) {
  const shown = matches.slice(0, visible);
  const label = matches.length === total ? `${total} public repositories loaded` : `${matches.length} of ${total} repositories match`;
  const list = shown.length ? shown.map((repo) => repoItemHtml(repo)).join("") : '<p class="empty-state">No repositories match these filters.</p>';
  const more = matches.length > visible ? `<div class="more-row"><button type="button" class="btn btn-ghost" data-action="more">Show more (${matches.length - visible} remaining)</button></div>` : "";
  const note = truncated ? " · more repositories exist than were loaded" : "";
  return `<p class="panel-note results-label">${esc(label)}${note}</p><div class="repo-list">${list}</div>${more}`;
}

export function exportBarHtml({ csv = true } = {}) {
  return `<div class="export-bar" role="group" aria-label="Export and refresh">
    <button type="button" class="btn btn-ghost" data-action="export" data-format="json">JSON</button>
    ${csv ? '<button type="button" class="btn btn-ghost" data-action="export" data-format="csv">CSV</button>' : ""}
    <button type="button" class="btn btn-ghost" data-action="export" data-format="md">Markdown</button>
    <button type="button" class="btn btn-ghost" data-action="refresh" title="Clear cached responses and reload">↻ Refresh</button>
  </div>`;
}

const REPOS_NOTE = '<p class="data-note">Star and fork totals add up the repositories loaded above (forks owned by the account included). Exports contain the repositories that match your filters.</p>';
const TRUNCATED_NOTICE = '<p class="notice">This account has more repositories than DevTrack loads (500). Totals cover the repositories loaded only.</p>';

function reposPanelHtml(data, state) {
  const matches = applyFilters(data.repos, state.filters);
  return `<section class="panel repos-panel" aria-labelledby="repos-heading">
    <div class="panel-heading"><div><span class="section-kicker">REPOSITORIES</span><h3 id="repos-heading">Search &amp; filter</h3></div>${exportBarHtml()}</div>
    ${repoControlsHtml(listLanguages(data.repos), state.filters)}
    <div id="repo-results" aria-live="polite">${repoResultsHtml({ matches, visible: state.visible, total: data.repos.length, truncated: data.truncated })}</div>
  </section>${REPOS_NOTE}`;
}

/* ---------- pages ---------- */

export function userPageHtml(data, state, now = new Date()) {
  const { user, repos, events, truncated } = data;
  const metrics = summarizeRepos(repos);
  const orgHint = user.type === "Organization" ? `<p class="notice">This account is an organization. <a href="${href.org(user.login)}">Open organization analytics</a> for a view built for organizations.</p>` : "";
  return `${orgHint}${profileHeaderHtml(user)}
    <div class="section-heading"><div><span class="section-kicker">REPOSITORY METRICS</span><h3>Profile overview</h3></div><span class="muted-label">Account created ${formatDate(user.created_at)}</span></div>
    ${statsHtml([
      { label: "Public repositories", value: formatNumber(user.public_repos), hint: "Reported by GitHub", icon: "▤" },
      { label: "Total stars", value: formatNumber(metrics.stars), hint: "Across loaded repositories", icon: "✳" },
      { label: "Total forks", value: formatNumber(metrics.forks), hint: "Across loaded repositories", icon: "⑂" },
      { label: "Languages", value: String(metrics.languageCount), hint: "Distinct primary languages", icon: "⌘" }
    ])}
    ${truncated ? TRUNCATED_NOTICE : ""}
    <div class="content-grid">${languagePanelHtml(metrics.languages)}${activityPanelHtml(events, now)}</div>
    ${reposPanelHtml(data, state)}`;
}

export function orgPageHtml(data, state) {
  const { org, repos, truncated } = data;
  const metrics = summarizeRepos(repos);
  const top = [...repos].sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)).slice(0, 5);
  const topList = top.length
    ? `<ol class="rank-list">${top.map((repo) => `<li><a href="${esc(href.repo(repo.owner?.login || org.login, repo.name))}">${esc(repo.name)}</a><span>✳ ${formatNumber(repo.stargazers_count)}</span></li>`).join("")}</ol>`
    : '<p class="empty-state">No public repositories found.</p>';
  return `${profileHeaderHtml(org, { showFollowing: false })}
    <div class="section-heading"><div><span class="section-kicker">ORGANIZATION METRICS</span><h3>Organization overview</h3></div><span class="muted-label">Created ${formatDate(org.created_at)}</span></div>
    ${statsHtml([
      { label: "Public repositories", value: formatNumber(org.public_repos), hint: "Reported by GitHub", icon: "▤" },
      { label: "Total stars", value: formatNumber(metrics.stars), hint: "Across loaded repositories", icon: "✳" },
      { label: "Total forks", value: formatNumber(metrics.forks), hint: "Across loaded repositories", icon: "⑂" },
      { label: "Languages", value: String(metrics.languageCount), hint: "Distinct primary languages", icon: "⌘" }
    ])}
    ${truncated ? TRUNCATED_NOTICE : ""}
    <div class="content-grid">${languagePanelHtml(metrics.languages)}<article class="panel"><div class="panel-heading"><div><span class="section-kicker">REACH</span><h3>Most starred repositories</h3></div></div>${topList}<p class="data-note">Organization member counts and activity feeds are not shown: DevTrack only uses public data that is available without signing in.</p></article></div>
    ${reposPanelHtml(data, state)}`;
}

function fmtSize(kb) {
  if (typeof kb !== "number") return "Unknown";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export function healthPanelHtml(health) {
  const rows = health.checks.map((check) => {
    const state = check.passed === null ? "unknown" : check.passed ? "pass" : "fail";
    const mark = check.passed === null ? "?" : check.passed ? "✓" : "✕";
    const word = check.passed === null ? "Unknown" : check.passed ? "Passed" : "Not met";
    return `<li class="check ${state}"><span class="check-mark" aria-hidden="true">${mark}</span><div><strong>${esc(check.label)} <span class="sr-only">(${word})</span></strong><small>${esc(check.detail)}</small></div></li>`;
  }).join("");
  const percent = health.max ? (health.score / health.max) * 100 : 0;
  return `<article class="panel health-panel"><div class="panel-heading"><div><span class="section-kicker">REPOSITORY HEALTH</span><h3>${health.score} of ${health.max} checks passed</h3></div></div>
    <div class="meter" role="img" aria-label="${health.score} of ${health.max} checks passed"><span style="width:${percent.toFixed(0)}%"></span></div>
    <ul class="checklist">${rows}</ul>
    <p class="data-note">A simple checklist built from public repository fields. It is a guide for orientation, not an official GitHub metric or a quality score.</p></article>`;
}

export function repoPageHtml(detail, now = new Date()) {
  const { repo, languages, contributors, contributorCount, latestRelease } = detail;
  const health = repoHealth(repo, now);
  const owner = repo.owner?.login || "";
  const site = repo.homepage ? safeExternalUrl(repo.homepage) : null;
  const badges = `${repo.archived ? '<span class="badge">Archived</span>' : ""}${repo.fork ? '<span class="badge">Fork</span>' : ""}${repo.private ? '<span class="badge">Private</span>' : ""}`;
  const topics = Array.isArray(repo.topics) && repo.topics.length ? `<div class="repo-tags topic-row">${repo.topics.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>` : "";
  const parent = repo.parent?.full_name ? `<span>Fork of <a href="${esc(href.repo(repo.parent.owner?.login || "", repo.parent.name || ""))}">${esc(repo.parent.full_name)}</a></span>` : "";

  const langItems = languagePercents(languages);
  const langBody = languages === null
    ? '<p class="empty-state">Language data is unavailable right now.</p>'
    : langItems.length
      ? languageBarHtml(langItems.map((l) => ({ name: l.name, share: l.percent, value: `${l.percent.toFixed(1)}%`, label: `${l.name}: ${l.percent.toFixed(1)}% of code bytes` })), `Language mix by bytes of code: ${langItems.slice(0, 5).map((l) => `${l.name} ${l.percent.toFixed(1)}%`).join(", ")}`)
      : '<p class="empty-state">GitHub reports no language data for this repository.</p>';

  const people = contributors === null
    ? '<p class="empty-state">The contributor list is unavailable right now.</p>'
    : contributors.length
      ? `<ul class="people">${contributors.map((c) => {
          const link = c.type === "User" && isValidUsername(c.login) ? href.user(c.login) : safeUrl(c.html_url);
          const target = c.type === "User" && isValidUsername(c.login) ? "" : ` ${ext}`;
          return `<li>${avatarHtml(c.avatar_url, "", "avatar-sm", 28)}<a href="${esc(link)}"${target}>${esc(c.login)}</a><span>${formatNumber(c.contributions)} commits</span></li>`;
        }).join("")}</ul>`
      : '<p class="empty-state">GitHub reports no contributors for this repository.</p>';

  const release = latestRelease
    ? `<a href="${esc(safeUrl(latestRelease.html_url))}" ${ext}>${esc(latestRelease.name || latestRelease.tag_name)}</a> · ${formatDate(latestRelease.published_at)}`
    : "No published release";
  const rows = [
    ["Default branch", esc(repo.default_branch || "Unknown")],
    ["Created", esc(formatDate(repo.created_at))],
    ["Last push", esc(formatDate(repo.pushed_at))],
    ["License", esc(repo.license?.spdx_id || repo.license?.name || "None detected")],
    ["Size", esc(fmtSize(repo.size))],
    ["Latest release", release]
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

  return `<div class="profile-row repo-header"><div class="profile-main"><div>
      <div class="profile-name-line"><h2>${esc(repo.full_name)}</h2>${badges}</div>
      <p class="bio">${esc(repo.description || "No description provided.")}</p>
      <div class="profile-meta"><a href="${esc(href.user(owner))}">Owner: ${esc(owner)}</a>${parent}${site ? `<a href="${esc(site)}" ${ext}>Website ↗</a>` : ""}<a href="${esc(safeUrl(repo.html_url))}" ${ext}>View on GitHub ↗</a></div>
      ${topics}
    </div></div>${exportBarHtml({ csv: false })}</div>
    <div class="section-heading"><div><span class="section-kicker">REPOSITORY METRICS</span><h3>Repository overview</h3></div><span class="muted-label">Last push ${esc(formatDate(repo.pushed_at))}</span></div>
    ${statsHtml([
      { label: "Stars", value: formatNumber(repo.stargazers_count), hint: "Users who starred it", icon: "✳" },
      { label: "Forks", value: formatNumber(repo.forks_count), hint: "Copies on GitHub", icon: "⑂" },
      { label: "Watchers", value: typeof repo.subscribers_count === "number" ? formatNumber(repo.subscribers_count) : "—", hint: "Subscribed to notifications", icon: "◉" },
      { label: "Open issues + PRs", value: formatNumber(repo.open_issues_count), hint: "GitHub counts both together", icon: "◌" },
      { label: "Contributors", value: contributorCount === null ? "—" : formatNumber(contributorCount), hint: contributorCount === null ? "Unavailable right now" : "GitHub accounts; very large projects may be undercounted", icon: "☰" }
    ], "stats-grid stats-grid-5")}
    <div class="content-grid">${healthPanelHtml(health)}<div class="stack"><article class="panel"><div class="panel-heading"><div><span class="section-kicker">TECH STACK</span><h3>Languages</h3></div><span class="panel-note">By bytes of code</span></div>${langBody}</article>
    <article class="panel"><div class="panel-heading"><div><span class="section-kicker">DETAILS</span><h3>About this repository</h3></div></div><dl class="details">${rows}</dl></article></div></div>
    <section class="panel repos-panel"><div class="panel-heading"><div><span class="section-kicker">COMMUNITY</span><h3>Top contributors</h3></div><span class="panel-note">Ranked by commits</span></div>${people}</section>`;
}

/* ---------- compare ---------- */

export function compareFormHtml(a = "", b = "") {
  return `<form id="compare-form" class="panel controls compare-form" novalidate>
    <label class="field field-grow"><span>First profile</span><input name="a" value="${esc(a)}" placeholder="e.g. torvalds" autocomplete="off" spellcheck="false"></label>
    <label class="field field-grow"><span>Second profile</span><input name="b" value="${esc(b)}" placeholder="e.g. sindresorhus" autocomplete="off" spellcheck="false"></label>
    <button type="submit" class="btn">Compare</button>
    <p id="compare-message" class="message" role="status" aria-live="polite"></p>
  </form>`;
}

export function compareRows(profile, now = new Date()) {
  const metrics = summarizeRepos(profile.repos);
  return {
    followers: profile.user.followers ?? 0,
    following: profile.user.following ?? 0,
    repos: profile.user.public_repos ?? 0,
    stars: metrics.stars,
    forks: metrics.forks,
    languages: metrics.languageCount,
    activity: sum(activityByDay(profile.events, 30, now)),
    created: profile.user.created_at,
    topLanguages: metrics.languages.slice(0, 3).map(([name]) => name).join(", ") || "—"
  };
}

export const COMPARE_METRICS = [
  { key: "followers", label: "Followers", compare: true },
  { key: "following", label: "Following", compare: false },
  { key: "repos", label: "Public repositories", compare: true },
  { key: "stars", label: "Total stars (loaded repos)", compare: true },
  { key: "forks", label: "Total forks (loaded repos)", compare: true },
  { key: "languages", label: "Distinct languages", compare: true },
  { key: "activity", label: "Public events, last 30 days", compare: true }
];

export function compareTableHtml(left, right, now = new Date()) {
  const a = compareRows(left, now);
  const b = compareRows(right, now);
  const nameA = left.user.login;
  const nameB = right.user.login;
  const rows = COMPARE_METRICS.map((metric) => {
    const lead = metric.compare && a[metric.key] !== b[metric.key] ? (a[metric.key] > b[metric.key] ? "a" : "b") : "";
    return `<tr><th scope="row">${esc(metric.label)}</th><td class="${lead === "a" ? "lead" : ""}">${formatNumber(a[metric.key])}</td><td class="${lead === "b" ? "lead" : ""}">${formatNumber(b[metric.key])}</td></tr>`;
  }).join("");
  const extra = `<tr><th scope="row">Top languages</th><td>${esc(a.topLanguages)}</td><td>${esc(b.topLanguages)}</td></tr><tr><th scope="row">Account created</th><td>${esc(formatDate(a.created))}</td><td>${esc(formatDate(b.created))}</td></tr>`;
  return `<div class="panel"><div class="table-wrap"><table class="compare-table"><caption class="sr-only">Comparison of ${esc(nameA)} and ${esc(nameB)}</caption>
    <thead><tr><th scope="col">Metric</th><th scope="col"><a href="${esc(href.user(nameA))}">${esc(nameA)}</a></th><th scope="col"><a href="${esc(href.user(nameB))}">${esc(nameB)}</a></th></tr></thead>
    <tbody>${rows}${extra}</tbody></table></div>
    <p class="data-note">Highlighted cells lead the comparison. Stars and forks add up each profile's loaded repositories (up to 500, forks owned by the account included). Public events come from GitHub's recent events feed, not from the contribution graph. A higher number is not a quality judgment.</p></div>`;
}

export function comparePageHtml(a, b, left, right, now = new Date()) {
  const body = left && right ? `<div class="compare-actions">${exportBarHtml({ csv: false })}</div>${compareTableHtml(left, right, now)}` : '<p class="empty-state">Enter two GitHub usernames to compare their public data.</p>';
  return `<div class="section-heading"><div><span class="section-kicker">SIDE BY SIDE</span><h3>Compare profiles</h3></div></div>${compareFormHtml(a, b)}${body}`;
}

/* ---------- most starred new repositories ---------- */

export function trendingFormHtml(language, days) {
  const options = DAY_OPTIONS.map((d) => `<option value="${d}"${d === days ? " selected" : ""}>Last ${d} days</option>`).join("");
  return `<form id="trending-form" class="panel controls" novalidate>
    <label class="field"><span>Created in the</span><select name="days">${options}</select></label>
    <label class="field field-grow"><span>Language (optional)</span><input name="language" value="${esc(language)}" placeholder="e.g. TypeScript" autocomplete="off" spellcheck="false"></label>
    <button type="submit" class="btn">Show repositories</button>
    <p id="trending-message" class="message" role="status" aria-live="polite"></p>
  </form>`;
}

export function trendingPageHtml(language, days, result) {
  const list = result
    ? result.items.length
      ? `<div class="panel"><p class="panel-note results-label">${formatNumber(result.total)} repositories created since ${esc(result.since)}${language ? ` in ${esc(language)}` : ""}; showing the top ${result.items.length} by stars.</p><div class="repo-list">${result.items.map((repo) => repoItemHtml(repo, { showOwner: true })).join("")}</div>${result.incomplete ? '<p class="notice">GitHub marked these search results as incomplete, so some repositories may be missing.</p>' : ""}</div>`
      : '<p class="empty-state">No repositories found for these filters.</p>'
    : "";
  return `<div class="section-heading"><div><span class="section-kicker">DISCOVER</span><h3>Most starred new repositories</h3></div></div>${trendingFormHtml(language, days)}${list}
    <p class="data-note">This list uses GitHub's Search API: repositories created in the chosen period, sorted by stars. It is not GitHub's own Trending page, and stars alone do not measure quality.</p>`;
}
