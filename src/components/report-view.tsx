import { useState } from "react";
import type {
  AnalysisReport,
  Classification,
  Language,
  SignalKey
} from "../features/analyzer/model";
import { RULESET_VERSION } from "../features/analyzer/rules";
import { messages } from "../i18n";
import { IssueCard } from "./issue-card";
import { IssueFilters } from "./issue-filters";
import { RepositorySummary } from "./repository-summary";

const classificationRank: Record<Classification, number> = {
  ready: 0,
  "needs-work": 1,
  "possibly-stale": 2
};

const methodologySignals: Array<[SignalKey, number]> = [
  ["specific-title", 10],
  ["context", 15],
  ["bounded-task", 15],
  ["acceptance", 20],
  ["verification", 15],
  ["location", 10],
  ["freshness", 10],
  ["available", 5]
];

const localCopy = {
  en: {
    report: "Issue readiness report",
    controls: "Report controls",
    shown: (shown: number, total: number) =>
      `Showing ${shown} of ${total} issues`,
    emptyFilter: "No issues match this classification.",
    methodologyIntro: (version: string) =>
      `Ruleset ${version}. Every issue receives the same eight deterministic checks.`,
    points: (points: number) => `${points} points`,
    precedence:
      "Possibly stale takes precedence when the repository is archived, the issue is over 180 days old, or a blocking label is present.",
    ready:
      "Ready requires a score of at least 70, repository activity within 180 days, and a present README, contribution guide, and license. All other issues need work."
  },
  "zh-CN": {
    report: "任务准备度报告",
    controls: "报告操作",
    shown: (shown: number, total: number) => `显示 ${shown} / ${total} 个任务`,
    emptyFilter: "此分类下没有任务。",
    methodologyIntro: (version: string) =>
      `规则版本 ${version}。每个任务都使用相同的八项确定性检查。`,
    points: (points: number) => `${points} 分`,
    precedence:
      "如果仓库已归档、任务超过 180 天未更新，或带有阻塞标签，“可能已过期”优先于其他分类。",
    ready:
      "“可以开始”要求得分至少 70 分、仓库在 180 天内有活动，并且 README、贡献指南和许可证均可读取；其余任务归为“需要完善”。"
  }
} satisfies Record<
  Language,
  {
    report: string;
    controls: string;
    shown: (shown: number, total: number) => string;
    emptyFilter: string;
    methodologyIntro: (version: string) => string;
    points: (points: number) => string;
    precedence: string;
    ready: string;
  }
>;

interface ReportViewProps {
  report: AnalysisReport;
  language: Language;
  onRefresh: () => void;
  now: Date;
}

export function ReportView({
  report,
  language,
  onRefresh,
  now
}: ReportViewProps) {
  const [activeFilter, setActiveFilter] = useState<Classification | "all">(
    "all"
  );
  const copy = messages[language];
  const reportCopy = localCopy[language];
  const assessments = report.assessments
    .filter(
      (assessment) =>
        activeFilter === "all" || assessment.classification === activeFilter
    )
    .toSorted((left, right) => {
      const classificationDifference =
        classificationRank[left.classification] -
        classificationRank[right.classification];
      if (classificationDifference !== 0) return classificationDifference;
      if (left.score !== right.score) return right.score - left.score;
      return left.issue.number - right.issue.number;
    });

  return (
    <section className="report-view" aria-labelledby="report-title">
      <RepositorySummary language={language} now={now} report={report} />

      <header className="report-view__header">
        <div>
          <p className="hero-kicker">{report.repository.fullName} / 02</p>
          <h2 id="report-title">{reportCopy.report}</h2>
          <p>
            {reportCopy.shown(assessments.length, report.assessments.length)}
          </p>
        </div>
        <div aria-label={reportCopy.controls} className="report-view__actions">
          <button className="primary-action" onClick={onRefresh} type="button">
            {copy.refresh}
          </button>
          <a href="#methodology">{copy.methodology}</a>
        </div>
      </header>

      <IssueFilters
        active={activeFilter}
        counts={report.counts}
        language={language}
        onChange={setActiveFilter}
      />

      <p className="scope-note">{copy.scopeNotice}</p>

      <div className="report-view__issues">
        {assessments.length > 0 ? (
          assessments.map((assessment) => (
            <IssueCard
              assessment={assessment}
              key={assessment.issue.number}
              language={language}
            />
          ))
        ) : (
          <p className="report-view__empty">{reportCopy.emptyFilter}</p>
        )}
      </div>

      <section
        aria-labelledby="methodology-title"
        className="report-methodology"
        id="methodology"
      >
        <p className="hero-kicker">03 / {RULESET_VERSION}</p>
        <h2 id="methodology-title">{copy.methodology}</h2>
        <p>{reportCopy.methodologyIntro(RULESET_VERSION)}</p>
        <ol>
          {methodologySignals.map(([key, weight]) => (
            <li key={key}>
              {copy.signals[key]} — {reportCopy.points(weight)}
            </li>
          ))}
        </ol>
        <p>{reportCopy.precedence}</p>
        <p>{reportCopy.ready}</p>
      </section>
    </section>
  );
}
