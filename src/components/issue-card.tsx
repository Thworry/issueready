import type {
  IssueAssessment,
  Language,
  SignalKey
} from "../features/analyzer/model";
import { messages } from "../i18n";

const signalOrder: SignalKey[] = [
  "specific-title",
  "context",
  "bounded-task",
  "acceptance",
  "verification",
  "location",
  "freshness",
  "available"
];

const signalWeights: Record<SignalKey, number> = {
  "specific-title": 10,
  context: 15,
  "bounded-task": 15,
  acceptance: 20,
  verification: 15,
  location: 10,
  freshness: 10,
  available: 5
};

const warningKeys = [
  "repository-archived",
  "repository-inactive",
  "prerequisites-incomplete"
] as const;
type WarningKey = (typeof warningKeys)[number];

const localCopy = {
  en: {
    issue: "Issue",
    updated: "Updated",
    labels: "Labels",
    noLabels: "No labels",
    unassigned: "Unassigned",
    assigned: (count: number) => `Assigned to ${count} people`,
    evidence: "Scoring evidence",
    passed: "Passed",
    missing: "Missing",
    warnings: "Warnings",
    checklistTitle: "Missing checklist",
    checklist: "Missing checks",
    noMissing: "No missing checks."
  },
  "zh-CN": {
    issue: "任务",
    updated: "更新于",
    labels: "标签",
    noLabels: "没有标签",
    unassigned: "尚未领取",
    assigned: (count: number) => `已有 ${count} 人领取`,
    evidence: "评分依据",
    passed: "已通过",
    missing: "缺失",
    warnings: "警告",
    checklistTitle: "待完善清单",
    checklist: "缺失检查项",
    noMissing: "没有缺失检查项。"
  }
} satisfies Record<
  Language,
  {
    issue: string;
    updated: string;
    labels: string;
    noLabels: string;
    unassigned: string;
    assigned: (count: number) => string;
    evidence: string;
    passed: string;
    missing: string;
    warnings: string;
    checklistTitle: string;
    checklist: string;
    noMissing: string;
  }
>;

function isWarningKey(value: string): value is WarningKey {
  return warningKeys.some((warning) => warning === value);
}

interface IssueCardProps {
  assessment: IssueAssessment;
  language: Language;
}

export function IssueCard({ assessment, language }: IssueCardProps) {
  const copy = messages[language];
  const cardCopy = localCopy[language];
  const { issue } = assessment;
  const headingId = `issue-${issue.number}-title`;
  const knownWarnings = assessment.warnings.filter(isWarningKey);
  const missingSignals = signalOrder.filter((key) =>
    assessment.missingSignals.includes(key)
  );
  const formattedDate = new Intl.DateTimeFormat(language, {
    dateStyle: "medium"
  }).format(issue.updatedAt);

  return (
    <article
      aria-labelledby={headingId}
      className={`issue-card issue-card--${assessment.classification}`}
    >
      <header className="issue-card__header">
        <div>
          <p className="issue-card__classification">
            {copy.classifications[assessment.classification]}
          </p>
          <h3 id={headingId}>
            <a href={issue.url} rel="noopener noreferrer" target="_blank">
              #{issue.number} {issue.title}
            </a>
          </h3>
        </div>
        <p
          aria-label={`${copy.scoreLabel}: ${assessment.score}/100`}
          className="issue-card__score"
        >
          <strong>{assessment.score}/100</strong>
        </p>
      </header>

      <div className="issue-card__metadata">
        <p>
          <span>{cardCopy.updated}: </span>
          <time dateTime={issue.updatedAt.toISOString()}>{formattedDate}</time>
        </p>
        <p>
          {issue.assigneeCount === 0
            ? cardCopy.unassigned
            : cardCopy.assigned(issue.assigneeCount)}
        </p>
      </div>

      <a
        className="issue-card__external-action"
        href={issue.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        {copy.openGitHub}
      </a>

      <div className="issue-card__labels">
        <h4>{cardCopy.labels}</h4>
        {issue.labels.length > 0 ? (
          <ul>
            {issue.labels.map((label, index) => (
              <li key={`${label}-${index}`}>{label}</li>
            ))}
          </ul>
        ) : (
          <p>{cardCopy.noLabels}</p>
        )}
      </div>

      <ol aria-label={cardCopy.evidence} className="issue-card__evidence">
        {signalOrder.map((key) => {
          const result = assessment.signals.find(
            (signal) => signal.key === key
          );
          const earned = result?.earned ?? 0;
          const available = result?.available ?? signalWeights[key];
          const passed = result?.passed ?? false;

          return (
            <li
              data-signal={key}
              data-state={passed ? "passed" : "missing"}
              key={key}
            >
              <span>{copy.signals[key]}</span>{" "}
              <strong>{passed ? cardCopy.passed : cardCopy.missing}</strong>{" "}
              <span className="issue-card__points">
                {earned}/{available}
              </span>
            </li>
          );
        })}
      </ol>

      {knownWarnings.length > 0 ? (
        <section className="issue-card__warnings">
          <h4>{cardCopy.warnings}</h4>
          <ul>
            {knownWarnings.map((warning) => (
              <li key={warning}>{copy.warnings[warning]}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="issue-card__checklist">
        <h4>{cardCopy.checklistTitle}</h4>
        {missingSignals.length > 0 ? (
          <ul aria-label={cardCopy.checklist}>
            {missingSignals.map((key) => (
              <li key={key}>{copy.signals[key]}</li>
            ))}
          </ul>
        ) : (
          <p>{cardCopy.noMissing}</p>
        )}
      </section>
    </article>
  );
}
