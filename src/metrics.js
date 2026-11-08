// Pure functions that turn GitHub API data into numbers. No DOM, easy to test.

export function summarizeRepos(repos) {
  const languages = {};
  let stars = 0;
  let forks = 0;
  for (const repo of repos) {
    stars += repo.stargazers_count || 0;
    forks += repo.forks_count || 0;
    if (repo.language) languages[repo.language] = (languages[repo.language] || 0) + 1;
  }
  return {
    stars,
    forks,
    languages: Object.entries(languages).sort((a, b) => b[1] - a[1]),
    languageCount: Object.keys(languages).length
  };
}

// Counts events per UTC day. GitHub timestamps are UTC, so UTC keeps results stable.
export function activityByDay(events, days = 30, now = new Date()) {
  const counts = Array(days).fill(0);
  const startMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1));
  for (const event of events) {
    const date = new Date(event.created_at);
    if (Number.isNaN(date.getTime())) continue;
    const dayMs = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    const index = Math.round((dayMs - startMs) / 86400000);
    if (index >= 0 && index < days) counts[index] += 1;
  }
  return counts;
}

const EVENT_LABELS = {
  PushEvent: "Pushes",
  PullRequestEvent: "Pull requests",
  PullRequestReviewEvent: "PR reviews",
  PullRequestReviewCommentEvent: "PR review comments",
  IssuesEvent: "Issues",
  IssueCommentEvent: "Issue comments",
  CommitCommentEvent: "Commit comments",
  WatchEvent: "Repos starred",
  ForkEvent: "Forks",
  CreateEvent: "Branches, tags or repos created",
  DeleteEvent: "Branches or tags deleted",
  ReleaseEvent: "Releases",
  PublicEvent: "Repos made public",
  MemberEvent: "Collaborator changes",
  GollumEvent: "Wiki edits"
};

export function summarizeEvents(events) {
  const counts = {};
  for (const event of events) counts[event.type] = (counts[event.type] || 0) + 1;
  return Object.entries(counts)
    .map(([type, count]) => ({ type, label: EVENT_LABELS[type] || type, count }))
    .sort((a, b) => b.count - a.count);
}

// Describes how much history the events endpoint actually returned.
export function eventWindow(events) {
  const times = events.map((e) => new Date(e.created_at).getTime()).filter((t) => !Number.isNaN(t));
  if (!times.length) return null;
  return { count: times.length, oldest: new Date(Math.min(...times)), newest: new Date(Math.max(...times)) };
}

export function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

// GET /repos/{owner}/{repo}/languages returns bytes per language.
export function languagePercents(bytesByLanguage) {
  const entries = Object.entries(bytesByLanguage || {}).filter(([, bytes]) => bytes > 0);
  const total = sum(entries.map(([, bytes]) => bytes));
  if (!total) return [];
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({ name, bytes, percent: (bytes / total) * 100 }));
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en", { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value || 0);
}

export function formatDate(value) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}
