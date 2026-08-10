export type Language = "en" | "zh-CN";
export type Classification = "ready" | "needs-work" | "possibly-stale";
export type FileState = "present" | "missing" | "unknown";

export type GitHubErrorKind = "not-found" | "rate-limit" | "network" | "api";

export class GitHubApiError extends Error {
  constructor(
    public readonly kind: GitHubErrorKind,
    message: string,
    public readonly status?: number,
    public readonly resetAt?: Date
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export interface RepoRef {
  owner: string;
  repo: string;
}

export interface GitHubRepository {
  full_name: string;
  html_url: string;
  description: string | null;
  archived: boolean;
  pushed_at: string;
  open_issues_count: number;
  default_branch: string;
}

export interface GitHubCommunityFile {
  url: string;
  html_url: string;
}

export interface GitHubCommunityProfile {
  health_percentage: number;
  files: {
    readme: GitHubCommunityFile | null;
    contributing: GitHubCommunityFile | null;
    license: GitHubCommunityFile | null;
  };
}

export interface GitHubIssue {
  number: number;
  title: string;
  html_url: string;
  body: string | null;
  labels: Array<string | { name: string }>;
  updated_at: string;
  assignees: Array<{ login: string }>;
  pull_request?: unknown;
}

export interface RepoSnapshot {
  repository: GitHubRepository;
  community: GitHubCommunityProfile | null;
  issues: GitHubIssue[];
}

export interface NormalizedRepository {
  fullName: string;
  url: string;
  description: string | null;
  archived: boolean;
  pushedAt: Date;
  openItemCount: number;
  readme: FileState;
  contributing: FileState;
  license: FileState;
}

export interface NormalizedIssue {
  number: number;
  title: string;
  url: string;
  body: string;
  labels: string[];
  updatedAt: Date;
  assigneeCount: number;
}

export interface AnalysisInput {
  repository: NormalizedRepository;
  issues: NormalizedIssue[];
  inspectedItemCount: number;
  apiScopeLimit: 100;
}

export type SignalKey =
  | "specific-title"
  | "context"
  | "bounded-task"
  | "acceptance"
  | "verification"
  | "location"
  | "freshness"
  | "available";

export interface SignalResult {
  key: SignalKey;
  earned: number;
  available: number;
  passed: boolean;
  evidence: string;
}

export interface IssueAssessment {
  issue: NormalizedIssue;
  score: number;
  classification: Classification;
  signals: SignalResult[];
  missingSignals: SignalKey[];
  warnings: string[];
}

export interface AnalysisReport {
  repository: NormalizedRepository;
  assessments: IssueAssessment[];
  counts: Record<Classification, number>;
  inspectedItemCount: number;
  apiScopeLimit: 100;
}
