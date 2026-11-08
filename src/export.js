// Builders for exportable reports. Pure functions, no DOM.

export const DATA_NOTES = [
  "Source: GitHub REST API, public data only.",
  "Public events are not the contribution graph; private activity is not included.",
  "Language mix counts each repository's primary language, not bytes of code.",
  "Repository lists may be truncated for very large accounts (see the `truncated` field)."
];

export function toRepoRow(repo) {
  return {
    name: repo.name,
    url: repo.html_url,
    description: repo.description ?? "",
    language: repo.language ?? "",
    stars: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    open_issues_incl_prs: repo.open_issues_count ?? 0,
    license: repo.license?.spdx_id ?? "",
    fork: Boolean(repo.fork),
    archived: Boolean(repo.archived),
    pushed_at: repo.pushed_at ?? "",
    updated_at: repo.updated_at ?? ""
  };
}

export function buildReport({ kind, subject, summary = {}, repos = [], truncated = false, extra = {}, now = new Date() }) {
  return {
    generator: "DevTrack",
    generatedAt: now.toISOString(),
    kind,
    subject,
    summary,
    truncated,
    repos: repos.map(toRepoRow),
    notes: DATA_NOTES,
    ...extra
  };
}

// Spreadsheet apps can run formulas that start with = + - @ (CSV injection).
// Prefixing an apostrophe keeps such cells as plain text.
export function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const CSV_COLUMNS = ["name", "url", "description", "language", "stars", "forks", "open_issues_incl_prs", "license", "fork", "archived", "pushed_at", "updated_at"];

export function reposToCsv(repos) {
  const rows = repos.map(toRepoRow);
  const lines = [CSV_COLUMNS.join(",")];
  for (const row of rows) lines.push(CSV_COLUMNS.map((column) => csvCell(row[column])).join(","));
  return lines.join("\r\n");
}

const mdCell = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

export function reportToMarkdown(report) {
  const lines = [`# DevTrack report: ${mdCell(report.subject)}`, "", `Generated ${report.generatedAt} from the GitHub REST API (public data).`, ""];
  const summaryEntries = Object.entries(report.summary || {});
  if (summaryEntries.length) {
    lines.push("## Summary", "", "| Metric | Value |", "| --- | --- |");
    for (const [key, value] of summaryEntries) lines.push(`| ${mdCell(key)} | ${mdCell(value)} |`);
    lines.push("");
  }
  if (report.repos?.length) {
    lines.push("## Repositories", "", "| Name | Language | Stars | Forks | Last push |", "| --- | --- | ---: | ---: | --- |");
    for (const repo of report.repos.slice(0, 50)) {
      lines.push(`| [${mdCell(repo.name)}](${repo.url}) | ${mdCell(repo.language || "-")} | ${repo.stars} | ${repo.forks} | ${mdCell(repo.pushed_at.slice(0, 10) || "-")} |`);
    }
    if (report.repos.length > 50) lines.push("", `Showing 50 of ${report.repos.length} repositories.`);
    lines.push("");
  }
  if (report.truncated) lines.push("> The repository list was truncated; totals cover only the repositories fetched.", "");
  lines.push("## Notes", "", ...report.notes.map((note) => `- ${note}`), "");
  return lines.join("\n");
}
