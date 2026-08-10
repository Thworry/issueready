import type {
  AnalysisInput,
  FileState,
  GitHubCommunityProfile,
  GitHubIssue,
  RepoSnapshot
} from "./model";

const CANDIDATES = new Set([
  "good first issue",
  "first timers only",
  "beginner",
  "beginner friendly",
  "help wanted"
]);

export function normalizeLabel(label: string): string {
  return label.toLowerCase().trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

export function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_>#~]/g, " ")
    .replace(/\x60+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fileState(
  community: GitHubCommunityProfile | null,
  key: "readme" | "contributing" | "license"
): FileState {
  if (!community) return "unknown";
  return community.files[key] ? "present" : "missing";
}

function labelName(label: GitHubIssue["labels"][number]): string {
  return typeof label === "string" ? label : label.name;
}

export function normalizeSnapshot(snapshot: RepoSnapshot): AnalysisInput {
  const issues = snapshot.issues
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: issue.title.trim(),
      url: issue.html_url,
      body: issue.body ?? "",
      labels: issue.labels.map(labelName).map(normalizeLabel),
      updatedAt: new Date(issue.updated_at),
      assigneeCount: issue.assignees.length
    }))
    .filter((issue) => issue.labels.some((label) => CANDIDATES.has(label)));

  return {
    repository: {
      fullName: snapshot.repository.full_name,
      url: snapshot.repository.html_url,
      description: snapshot.repository.description,
      archived: snapshot.repository.archived,
      pushedAt: new Date(snapshot.repository.pushed_at),
      openItemCount: snapshot.repository.open_issues_count,
      readme: fileState(snapshot.community, "readme"),
      contributing: fileState(snapshot.community, "contributing"),
      license: fileState(snapshot.community, "license")
    },
    issues,
    inspectedItemCount: snapshot.issues.length,
    apiScopeLimit: 100
  };
}
