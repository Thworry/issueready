import type { AnalysisReport, Language } from "../features/analyzer/model";
import { messages } from "../i18n";

const DAY_MS = 24 * 60 * 60 * 1000;

const localCopy = {
  en: {
    noDescription: "No repository description provided.",
    warnings: "Repository warnings"
  },
  "zh-CN": {
    noDescription: "仓库没有提供说明。",
    warnings: "仓库警告"
  }
} satisfies Record<Language, Record<string, string>>;

interface RepositorySummaryProps {
  report: AnalysisReport;
  language: Language;
  now: Date;
}

export function RepositorySummary({
  report,
  language,
  now
}: RepositorySummaryProps) {
  const copy = messages[language];
  const summaryCopy = localCopy[language];
  const { repository } = report;
  const inactive = now.getTime() - repository.pushedAt.getTime() > 180 * DAY_MS;
  const prerequisites = [
    [copy.readme, repository.readme],
    [copy.contributing, repository.contributing],
    [copy.license, repository.license]
  ] as const;

  return (
    <section className="repository-summary" aria-labelledby="repository-title">
      <header className="repository-summary__header">
        <h2 id="repository-title">
          <a href={repository.url} rel="noopener noreferrer" target="_blank">
            {repository.fullName}
          </a>
        </h2>
        <p>{repository.description ?? summaryCopy.noDescription}</p>
      </header>

      {repository.archived || inactive ? (
        <ul
          aria-label={summaryCopy.warnings}
          className="repository-summary__warnings"
        >
          {repository.archived ? (
            <li>{copy.warnings["repository-archived"]}</li>
          ) : null}
          {inactive ? <li>{copy.warnings["repository-inactive"]}</li> : null}
        </ul>
      ) : null}

      <div className="repository-summary__prerequisites">
        <h3>{copy.repositoryFiles}</h3>
        <dl>
          {prerequisites.map(([label, state]) => (
            <div className="repository-summary__prerequisite" key={label}>
              <dt>{label}</dt>
              <dd data-state={state}>{copy.fileStates[state]}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
