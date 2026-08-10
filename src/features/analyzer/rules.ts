import type {
  AnalysisInput,
  AnalysisReport,
  Classification,
  IssueAssessment,
  NormalizedIssue,
  NormalizedRepository,
  SignalKey,
  SignalResult
} from "./model";
import { stripMarkdown } from "./normalize";

export const RULESET_VERSION = "1.0.0";

const TERMS = {
  context: [
    "background",
    "context",
    "problem",
    "motivation",
    "背景",
    "上下文",
    "问题",
    "动机"
  ],
  task: [
    "scope",
    "task",
    "steps",
    "implementation",
    "范围",
    "任务",
    "步骤",
    "实现"
  ],
  acceptance: [
    "acceptance criteria",
    "definition of done",
    "done when",
    "expected result",
    "expected behavior",
    "验收标准",
    "完成标准",
    "预期结果",
    "预期行为"
  ],
  verification: [
    "test",
    "tests",
    "testing",
    "reproduce",
    "reproduction",
    "verify",
    "validation",
    "测试",
    "复现",
    "验证"
  ],
  location: [
    "file",
    "component",
    "module",
    "page",
    "文件",
    "组件",
    "模块",
    "页面"
  ]
} as const;

const GENERIC_TITLES = new Set([
  "fix",
  "update",
  "help",
  "bug",
  "issue",
  "feature",
  "修复",
  "更新",
  "帮助",
  "问题",
  "功能"
]);
const BLOCKING_LABELS = new Set(["blocked", "on hold", "wontfix", "waiting"]);
const DAY_MS = 24 * 60 * 60 * 1000;

const containsTerm = (body: string, terms: readonly string[]) => {
  const normalized = body.toLowerCase().replace(/^#+\s*/gm, "");
  return terms.some((term) => normalized.includes(term));
};

const ageInDays = (date: Date, now: Date) => {
  const dateTime = date.getTime();
  const nowTime = now.getTime();

  if (!Number.isFinite(dateTime) || !Number.isFinite(nowTime)) {
    throw new RangeError("IssueReady scoring requires valid dates");
  }

  return Math.max(0, Math.floor((nowTime - dateTime) / DAY_MS));
};

function result(
  key: SignalKey,
  earned: number,
  available: number,
  passed: boolean
): SignalResult {
  return {
    key,
    earned,
    available,
    passed,
    evidence: `${key}:${passed ? "passed" : "missing"}`
  };
}

function evaluateSignals(issue: NormalizedIssue, now: Date): SignalResult[] {
  const visible = stripMarkdown(issue.body);
  const normalizedTitle = issue.title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim();
  const titlePass =
    issue.title.length >= 12 &&
    issue.title.length <= 120 &&
    !GENERIC_TITLES.has(normalizedTitle);
  const contextPass =
    visible.length >= 120 || containsTerm(issue.body, TERMS.context);
  const taskPass =
    containsTerm(issue.body, TERMS.task) ||
    /^\s*\d+[.)]\s+/m.test(issue.body) ||
    /^\s*[-*]\s+\[[ xX]\]\s+/m.test(issue.body);
  const acceptancePass = containsTerm(issue.body, TERMS.acceptance);
  const verificationPass = containsTerm(issue.body, TERMS.verification);
  const locationPass =
    /(?:^|\s)[\w.-]+\/[\w./-]+/m.test(issue.body) ||
    /\b[\w-]+\.[A-Za-z0-9]{1,8}\b/.test(issue.body) ||
    /\x60[^\x60\n]+\x60/.test(issue.body) ||
    containsTerm(issue.body, TERMS.location);
  const issueAge = ageInDays(issue.updatedAt, now);
  const freshnessPoints = issueAge <= 90 ? 10 : issueAge <= 180 ? 5 : 0;
  const availablePass = issue.assigneeCount === 0;

  return [
    result("specific-title", titlePass ? 10 : 0, 10, titlePass),
    result("context", contextPass ? 15 : 0, 15, contextPass),
    result("bounded-task", taskPass ? 15 : 0, 15, taskPass),
    result("acceptance", acceptancePass ? 20 : 0, 20, acceptancePass),
    result("verification", verificationPass ? 15 : 0, 15, verificationPass),
    result("location", locationPass ? 10 : 0, 10, locationPass),
    result("freshness", freshnessPoints, 10, freshnessPoints > 0),
    result("available", availablePass ? 5 : 0, 5, availablePass)
  ];
}

function repositoryWarnings(
  repository: NormalizedRepository,
  now: Date
): string[] {
  const warnings: string[] = [];

  if (repository.archived) warnings.push("repository-archived");
  if (ageInDays(repository.pushedAt, now) > 180) {
    warnings.push("repository-inactive");
  }
  if (
    repository.readme !== "present" ||
    repository.contributing !== "present" ||
    repository.license !== "present"
  ) {
    warnings.push("prerequisites-incomplete");
  }

  return warnings;
}

export function assessIssue(
  issue: NormalizedIssue,
  repository: NormalizedRepository,
  now: Date
): IssueAssessment {
  const signals = evaluateSignals(issue, now);
  const score = signals.reduce((total, signal) => total + signal.earned, 0);
  const stale =
    repository.archived ||
    ageInDays(issue.updatedAt, now) > 180 ||
    issue.labels.some((label) => BLOCKING_LABELS.has(label));

  const ready =
    score >= 70 &&
    ageInDays(repository.pushedAt, now) <= 180 &&
    repository.readme === "present" &&
    repository.contributing === "present" &&
    repository.license === "present";

  const classification = stale
    ? "possibly-stale"
    : ready
      ? "ready"
      : "needs-work";

  return {
    issue,
    score,
    classification,
    signals,
    missingSignals: signals
      .filter(({ passed }) => !passed)
      .map(({ key }) => key),
    warnings: repositoryWarnings(repository, now)
  };
}

export function analyzeRepository(
  input: AnalysisInput,
  now: Date
): AnalysisReport {
  ageInDays(input.repository.pushedAt, now);
  const assessments = input.issues.map((issue) =>
    assessIssue(issue, input.repository, now)
  );
  const counts: Record<Classification, number> = {
    ready: 0,
    "needs-work": 0,
    "possibly-stale": 0
  };

  for (const assessment of assessments) {
    counts[assessment.classification] += 1;
  }

  return {
    repository: input.repository,
    assessments,
    counts,
    inspectedItemCount: input.inspectedItemCount,
    apiScopeLimit: input.apiScopeLimit
  };
}
