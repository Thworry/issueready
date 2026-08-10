# IssueReady methodology

This document defines deterministic ruleset **1.0.0**. The implementation source of truth is `src/features/analyzer/normalize.ts` and `src/features/analyzer/rules.ts`; a rule change must update those files, their boundary tests, the bilingual interface copy, and this document in the same pull request.

IssueReady is a maintenance aid. A score describes how much actionable information the public issue currently exposes; it does not measure code quality, contributor ability, security, maintainer intent, or the probability that a contribution will be accepted.

## Analysis scope

For one repository, IssueReady requests the 100 most recently updated open items from GitHub with `state=open`, `sort=updated`, `direction=desc`, and `per_page=100`. It does not paginate. Pull requests returned by the issues endpoint are removed locally, so they still count toward the 100-item API window. Older issues can therefore be omitted.

The analysis uses public, unauthenticated GitHub REST API requests. A fresh run makes at most three requests and is subject to [GitHub's unauthenticated rate limits](https://docs.github.com/rest/using-the-rest-api/rate-limits-for-the-rest-api). A ten-minute session cache can avoid those requests. A forced refresh bypasses the cache.

## Label normalization and candidate selection

Every issue label is normalized in this order:

1. convert to lowercase;
2. trim leading and trailing whitespace;
3. replace each run of hyphens or underscores with one space;
4. collapse each run of whitespace to one space.

An open, non-pull-request item is a candidate when at least one normalized label exactly equals one of:

- `good first issue`
- `first timers only`
- `beginner`
- `beginner friendly`
- `help wanted`

The same normalized labels are checked for these blocking values:

- `blocked`
- `on hold`
- `wontfix`
- `waiting`

A blocking label does not change the numeric score; it changes classification precedence as described below.

## Text dictionaries

Dictionary matching is case-insensitive substring matching against the issue body. Leading Markdown heading markers are ignored for this check. English and Simplified Chinese terms are treated equally.

| Family              | Exact terms                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Context             | `background`, `context`, `problem`, `motivation`, `背景`, `上下文`, `问题`, `动机`                                                               |
| Bounded task        | `scope`, `task`, `steps`, `implementation`, `范围`, `任务`, `步骤`, `实现`                                                                       |
| Acceptance criteria | `acceptance criteria`, `definition of done`, `done when`, `expected result`, `expected behavior`, `验收标准`, `完成标准`, `预期结果`, `预期行为` |
| Verification        | `test`, `tests`, `testing`, `reproduce`, `reproduction`, `verify`, `validation`, `测试`, `复现`, `验证`                                          |
| Location hint       | `file`, `component`, `module`, `page`, `文件`, `组件`, `模块`, `页面`                                                                            |

## The eight signals

Scores add to a maximum of 100 points. Boundaries are inclusive unless explicitly stated otherwise.

| Signal                  | Weight | Passing rule                                                                                                                                                  |
| ----------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Specific title**      |     10 | The trimmed title is 12–120 JavaScript string units long and is not a generic title after normalization.                                                      |
| **Context**             |     15 | The Markdown-stripped visible body is at least 120 characters long, or the body contains a Context dictionary term.                                           |
| **Bounded task**        |     15 | The body contains a Bounded task dictionary term, a numbered-list item such as `1.` or `1)`, or a Markdown checkbox item.                                     |
| **Acceptance criteria** |     20 | The body contains an Acceptance criteria dictionary term.                                                                                                     |
| **Verification**        |     15 | The body contains a Verification dictionary term.                                                                                                             |
| **Location hint**       |     10 | The body contains a path, a filename with an extension, inline-code content, or a Location hint dictionary term.                                              |
| **Freshness**           |     10 | Updated 0–90 whole days ago: 10 points; 91–180 whole days ago: 5 points; more than 180 whole days ago: 0 points. Both 90 and 180 days still pass this signal. |
| **Available to claim**  |      5 | The issue has no assignees.                                                                                                                                   |

Age is the number of complete 24-hour periods between the timestamp and the analysis time, rounded down. Future timestamps are treated as zero days old. Invalid dates stop the analysis rather than silently changing a score.

### Generic titles

For the Specific title check, the title is converted to lowercase, punctuation other than hyphens is removed, and surrounding whitespace is trimmed. These exact normalized titles are generic:

- `fix`
- `update`
- `help`
- `bug`
- `issue`
- `feature`
- `修复`
- `更新`
- `帮助`
- `问题`
- `功能`

### Markdown handling

For the Context length alternative, IssueReady removes HTML tags, image destinations, link destinations, common Markdown punctuation, backticks, and repeated whitespace before counting visible text. The body is never rendered as remote HTML. Dictionary and structural-pattern checks use the original body text.

### Location patterns

The Location hint signal also recognizes these structural cues:

- a path-like token containing a slash, such as `src/components/card.tsx`;
- a filename with a 1–8-character alphanumeric extension, such as `README.md`;
- non-empty inline-code content between backticks.

## Repository prerequisites

GitHub's repository and community-profile responses establish four repository conditions:

- the latest repository push is no more than 180 whole days old;
- README is present;
- a contribution guide is present;
- a license is present.

README, contribution guide, and license each have one of three states: `present`, `missing`, or `unknown`. When the community-profile request is unavailable, all three are `unknown`. Unknown is never presented as confirmed missing, but both `missing` and `unknown` prevent the **Ready** classification because presence has not been established.

Repository warnings are emitted independently when the repository is archived, its last push is strictly more than 180 days old, or any contributor prerequisite is missing or unknown.

## Classification and precedence

Classification occurs after all eight signals are scored:

1. **Possibly stale** takes precedence when the repository is archived, the issue is strictly more than 180 whole days old, or the issue has a normalized blocking label.
2. Otherwise, **Ready** requires a score of at least 70, a repository push no more than 180 whole days ago, and README, contribution guide, and license all confirmed `present`.
3. Every other candidate is **Needs work**.

At exactly 180 days, the issue receives 5 freshness points and is not stale on age alone; at 181 days it receives 0 freshness points and is Possibly stale. At exactly 180 days since the repository's last push, repository activity still satisfies the Ready prerequisite; only a value strictly greater than 180 days is inactive.

The classification is always printed as text in the interface and is not communicated by color alone.

## Reproducibility

For the same normalized public input, analysis timestamp, and ruleset version, IssueReady produces the same scores and classifications. Cards are displayed by classification in the order Ready, Needs work, Possibly stale; then by score descending; then by issue number ascending. No AI model, personalization, repository allowlist, or hidden ranking factor is involved.
