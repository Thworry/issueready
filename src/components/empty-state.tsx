import type { Language } from "../features/analyzer/model";
import { messages } from "../i18n";
import { CopyButton } from "./copy-button";

const CANDIDATE_LABELS = [
  "good first issue",
  "first timers only",
  "beginner",
  "beginner friendly",
  "help wanted"
] as const;

const templates: Record<Language, string> = {
  en: `## Background

Explain why this change matters.

## Task

- [ ] Describe the bounded change.

## Acceptance criteria

- [ ] State the observable result.

## Verification

Explain how a contributor and reviewer can verify the change.`,
  "zh-CN": `## 背景

说明为什么这项改动很重要。

## 任务

- [ ] 描述范围明确的改动。

## 验收标准

- [ ] 说明可观察的结果。

## 验证

说明贡献者和审核者如何验证这项改动。`
};

interface EmptyStateProps {
  language: Language;
}

export function EmptyState({ language }: EmptyStateProps) {
  const copy = messages[language];

  return (
    <section className="status-panel empty-state" aria-labelledby="empty-title">
      <h2 id="empty-title">{copy.emptyTitle}</h2>
      <p>{copy.emptyBody}</p>
      <div className="empty-state__labels">
        <p>{copy.searchedLabels}</p>
        <ul aria-label={copy.searchedLabels} className="label-list">
          {CANDIDATE_LABELS.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </div>
      <CopyButton
        copiedLabel={copy.copied}
        errorLabel={copy.copyFailed}
        idleLabel={copy.copyChecklist}
        text={templates[language]}
      />
      <p className="scope-note">{copy.scopeNotice}</p>
    </section>
  );
}
