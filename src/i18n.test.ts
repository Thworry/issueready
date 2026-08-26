import { describe, expect, it } from "vitest";
import type {
  Classification,
  FileState,
  SignalKey
} from "./features/analyzer/model";
import { messages } from "./i18n";

const classifications: Classification[] = [
  "ready",
  "needs-work",
  "possibly-stale"
];

const signals: SignalKey[] = [
  "specific-title",
  "context",
  "bounded-task",
  "acceptance",
  "verification",
  "location",
  "freshness",
  "available"
];

const fileStates: FileState[] = ["present", "missing", "unknown"];
const loadingPhases = ["validating", "reading", "assessing"] as const;
const warnings = [
  "repository-archived",
  "repository-inactive",
  "prerequisites-incomplete"
] as const;
const errors = [
  "invalid-url",
  "not-found",
  "rate-limit",
  "network",
  "api",
  "unknown"
] as const;

describe("messages", () => {
  it("keeps English and Simplified Chinese keys in parity", () => {
    expect(Object.keys(messages["zh-CN"]).sort()).toStrictEqual(
      Object.keys(messages.en).sort()
    );
  });

  it.each(classifications)("covers the %s classification", (classification) => {
    expect(messages.en.classifications[classification]).toBeTruthy();
    expect(messages["zh-CN"].classifications[classification]).toBeTruthy();
  });

  it.each(signals)("covers the %s signal", (signal) => {
    expect(messages.en.signals[signal]).toBeTruthy();
    expect(messages["zh-CN"].signals[signal]).toBeTruthy();
  });

  it.each(fileStates)("covers the %s file state", (fileState) => {
    expect(messages.en.fileStates[fileState]).toBeTruthy();
    expect(messages["zh-CN"].fileStates[fileState]).toBeTruthy();
  });

  it.each(loadingPhases)("covers the %s loading phase", (phase) => {
    expect(messages.en.loading[phase]).toBeTruthy();
    expect(messages["zh-CN"].loading[phase]).toBeTruthy();
  });

  it.each(warnings)("covers the %s warning", (warning) => {
    expect(messages.en.warnings[warning]).toBeTruthy();
    expect(messages["zh-CN"].warnings[warning]).toBeTruthy();
  });

  it.each(errors)("covers the %s error", (error) => {
    expect(messages.en.errors[error]).toBeTruthy();
    expect(messages["zh-CN"].errors[error]).toBeTruthy();
  });

  it("names IssueReady in both languages", () => {
    expect(messages.en.brand).toContain("IssueReady");
    expect(messages["zh-CN"].brand).toContain("IssueReady");
  });

  it("positions the landing copy as a maintainer pre-publish workflow", () => {
    const englishHero = `${messages.en.tagline} ${messages.en.intro}`;
    const chineseHero = `${messages["zh-CN"].tagline} ${messages["zh-CN"].intro}`;

    expect(englishHero).toMatch(/maintainer/i);
    expect(englishHero).toMatch(/before/i);
    expect(englishHero).toMatch(/triage|onboarding/i);
    expect(chineseHero).toContain("维护者");
    expect(chineseHero).toContain("发布前");
    expect(chineseHero).toMatch(/分诊|贡献者上手/);
  });

  it("distinguishes repository adoption from issue preparation", () => {
    expect(`RepoScope${messages.en.scope}`).toMatch(
      /repository before adoption.*IssueReady.*maintainers.*issues/i
    );
    expect(`RepoScope${messages["zh-CN"].scope}`).toMatch(
      /仓库.*IssueReady.*维护者.*(?:任务|Issue)/
    );
  });

  it("formats English and Chinese result counts", () => {
    expect(messages.en.resultCount(1)).toBe("1 issue");
    expect(messages.en.resultCount(2)).toBe("2 issues");
    expect(messages["zh-CN"].resultCount(1)).toBe("1 个任务");
    expect(messages["zh-CN"].resultCount(2)).toBe("2 个任务");
  });

  it("includes the supplied local rate-limit reset time", () => {
    expect(messages.en.rateLimitReset("4:30 PM")).toBe(
      "Try again after 4:30 PM"
    );
    expect(messages["zh-CN"].rateLimitReset("16:30")).toBe("请在 16:30 后重试");
  });
});
