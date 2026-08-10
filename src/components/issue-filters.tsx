import type {
  AnalysisReport,
  Classification,
  Language
} from "../features/analyzer/model";
import { messages } from "../i18n";

const classifications: Classification[] = [
  "ready",
  "needs-work",
  "possibly-stale"
];

const filterLabel: Record<Language, string> = {
  en: "Filter issues by classification",
  "zh-CN": "按分类筛选任务"
};

export interface IssueFiltersProps {
  counts: AnalysisReport["counts"];
  active: Classification | "all";
  language: Language;
  onChange: (value: Classification | "all") => void;
}

export function IssueFilters({
  counts,
  active,
  language,
  onChange
}: IssueFiltersProps) {
  const copy = messages[language];
  const total = classifications.reduce(
    (sum, classification) => sum + counts[classification],
    0
  );
  const filters: Array<{
    value: Classification | "all";
    label: string;
    count: number;
  }> = [
    { value: "all", label: copy.all, count: total },
    ...classifications.map((classification) => ({
      value: classification,
      label: copy.classifications[classification],
      count: counts[classification]
    }))
  ];

  return (
    <nav aria-label={filterLabel[language]} className="issue-filters">
      {filters.map(({ value, label, count }) => (
        <button
          aria-pressed={active === value}
          className="issue-filters__button"
          key={value}
          onClick={() => onChange(value)}
          type="button"
        >
          <span>{label}</span> <strong>{count}</strong>
        </button>
      ))}
    </nav>
  );
}
