// Search, filter, sort and health indicators for repository lists.

const SORTERS = {
  updated: (a, b) => new Date(b.updated_at) - new Date(a.updated_at),
  pushed: (a, b) => new Date(b.pushed_at) - new Date(a.pushed_at),
  stars: (a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0),
  forks: (a, b) => (b.forks_count || 0) - (a.forks_count || 0),
  issues: (a, b) => (b.open_issues_count || 0) - (a.open_issues_count || 0),
  name: (a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" })
};

export const SORT_OPTIONS = [
  ["updated", "Recently updated"],
  ["pushed", "Last push"],
  ["stars", "Most stars"],
  ["forks", "Most forks"],
  ["issues", "Most open issues"],
  ["name", "Name (A–Z)"]
];

export function sortRepos(repos, key = "updated") {
  const sorter = SORTERS[key] || SORTERS.updated;
  return [...repos].sort(sorter);
}

export function filterRepos(repos, { query = "", language = "", forks = true, archived = true } = {}) {
  const needle = query.trim().toLowerCase();
  return repos.filter((repo) => {
    if (!forks && repo.fork) return false;
    if (!archived && repo.archived) return false;
    if (language && repo.language !== language) return false;
    if (!needle) return true;
    const haystack = [repo.name, repo.description, ...(Array.isArray(repo.topics) ? repo.topics : [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function listLanguages(repos) {
  return [...new Set(repos.map((repo) => repo.language).filter(Boolean))].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

export function daysSince(value, now = new Date()) {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((now.getTime() - time) / 86400000));
}

// Transparent checklist built only from fields GitHub returns for a repository.
// It is a heuristic for orientation, not an official GitHub metric.
// A check is `null` (unknown) when GitHub did not return the field; unknown checks are not scored.
export function repoHealth(repo, now = new Date()) {
  const idle = daysSince(repo.pushed_at, now);
  const checks = [
    {
      id: "recent-push",
      label: "Pushed in the last 90 days",
      passed: idle === null ? null : idle <= 90,
      detail: idle === null ? "No push date returned." : `Last push ${idle} day${idle === 1 ? "" : "s"} ago.`
    },
    {
      id: "license",
      label: "Has a license",
      passed: repo.license === undefined ? null : Boolean(repo.license),
      detail: repo.license ? `License: ${repo.license.spdx_id || repo.license.name}.` : "No license detected by GitHub."
    },
    {
      id: "description",
      label: "Has a description",
      passed: repo.description === undefined ? null : Boolean(repo.description && repo.description.trim()),
      detail: repo.description ? "Description present." : "No description."
    },
    {
      id: "topics",
      label: "Has topics",
      passed: Array.isArray(repo.topics) ? repo.topics.length > 0 : null,
      detail: Array.isArray(repo.topics) ? `${repo.topics.length} topic${repo.topics.length === 1 ? "" : "s"}.` : "Topics not returned."
    },
    {
      id: "not-archived",
      label: "Not archived",
      passed: repo.archived === undefined ? null : !repo.archived,
      detail: repo.archived ? "Archived (read-only)." : "Open for changes."
    },
    {
      id: "issues-enabled",
      label: "Issues enabled",
      passed: repo.has_issues === undefined ? null : Boolean(repo.has_issues),
      detail: repo.has_issues ? "Issues are enabled." : "Issues are disabled."
    }
  ];
  const scored = checks.filter((check) => check.passed !== null);
  const score = scored.filter((check) => check.passed).length;
  return { checks, score, max: scored.length };
}

export function applyFilters(repos, filters = {}) {
  return sortRepos(filterRepos(repos, filters), filters.sort);
}

export function defaultFilters() {
  return { query: "", language: "", sort: "updated", forks: true, archived: true };
}
