import { describe, expect, it } from "vitest";
import type {
  AnalysisInput,
  NormalizedIssue,
  NormalizedRepository,
  SignalKey
} from "./model";
import { analyzeRepository, assessIssue, RULESET_VERSION } from "./rules";

const NOW = new Date("2026-08-10T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS);
}

function repository(
  overrides: Partial<NormalizedRepository> = {}
): NormalizedRepository {
  return {
    fullName: "acme/tool",
    url: "https://github.com/acme/tool",
    description: "A useful public tool",
    archived: false,
    pushedAt: daysAgo(1),
    openItemCount: 4,
    readme: "present",
    contributing: "present",
    license: "present",
    ...overrides
  };
}

function issue(overrides: Partial<NormalizedIssue> = {}): NormalizedIssue {
  return {
    number: 1,
    title: "Add focused parser coverage",
    url: "https://github.com/acme/tool/issues/1",
    body: "",
    labels: ["good first issue"],
    updatedAt: daysAgo(1),
    assigneeCount: 0,
    ...overrides
  };
}

function signal(
  key: SignalKey,
  overrides: Partial<NormalizedIssue> = {},
  repositoryOverrides: Partial<NormalizedRepository> = {}
) {
  return assessIssue(
    issue(overrides),
    repository(repositoryOverrides),
    NOW
  ).signals.find((result) => result.key === key);
}

const contextTerms = [
  "background",
  "context",
  "problem",
  "motivation",
  "背景",
  "上下文",
  "问题",
  "动机"
];
const taskTerms = [
  "scope",
  "task",
  "steps",
  "implementation",
  "范围",
  "任务",
  "步骤",
  "实现"
];
const acceptanceTerms = [
  "acceptance criteria",
  "definition of done",
  "done when",
  "expected result",
  "expected behavior",
  "验收标准",
  "完成标准",
  "预期结果",
  "预期行为"
];
const verificationTerms = [
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
];
const locationTerms = [
  "file",
  "component",
  "module",
  "page",
  "文件",
  "组件",
  "模块",
  "页面"
];

describe("versioned deterministic signals", () => {
  it("publishes ruleset version 1.0.0", () => {
    expect(RULESET_VERSION).toBe("1.0.0");
  });

  it.each([
    ["12345678901", false, 0],
    ["123456789012", true, 10],
    ["a".repeat(120), true, 10],
    ["a".repeat(121), false, 0]
  ])(
    "applies the specific-title length boundary to %s",
    (title, passed, earned) => {
      expect(signal("specific-title", { title })).toMatchObject({
        passed,
        earned
      });
    }
  );

  it.each([
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
  ])("rejects generic-only title %s", (title) => {
    expect(signal("specific-title", { title })).toMatchObject({
      passed: false,
      earned: 0
    });
  });

  it.each([
    [119, false],
    [120, true]
  ])("uses %i visible body characters for context", (length, passed) => {
    expect(signal("context", { body: "a".repeat(length) })).toMatchObject({
      passed,
      earned: passed ? 15 : 0
    });
  });

  it.each(contextTerms)("recognizes context term %s", (term) => {
    expect(signal("context", { body: `# ${term}` })).toMatchObject({
      passed: true,
      earned: 15
    });
  });

  it.each(taskTerms)("recognizes bounded-task term %s", (term) => {
    expect(signal("bounded-task", { body: `## ${term}` })).toMatchObject({
      passed: true,
      earned: 15
    });
  });

  it.each([
    "1. Do the work",
    "2) Do the work",
    "- [ ] Do the work",
    "* [x] Done"
  ])("recognizes structured task marker %s", (body) => {
    expect(signal("bounded-task", { body })).toMatchObject({
      passed: true,
      earned: 15
    });
  });

  it.each(acceptanceTerms)("recognizes acceptance term %s", (term) => {
    expect(signal("acceptance", { body: `## ${term}` })).toMatchObject({
      passed: true,
      earned: 20
    });
  });

  it.each(verificationTerms)("recognizes verification term %s", (term) => {
    expect(signal("verification", { body: `## ${term}` })).toMatchObject({
      passed: true,
      earned: 15
    });
  });

  it.each(locationTerms)("recognizes location term %s", (term) => {
    expect(signal("location", { body: `Edit the ${term}` })).toMatchObject({
      passed: true,
      earned: 10
    });
  });

  it.each([
    ["src/app/router.ts", "file path"],
    ["README.md", "filename"],
    ["Use `WidgetFactory` here", "backticked code identifier"]
  ])("recognizes a %s as a location hint", (body) => {
    expect(signal("location", { body })).toMatchObject({
      passed: true,
      earned: 10
    });
  });

  it.each([
    [90, 10, true],
    [180, 5, true],
    [181, 0, false]
  ])("awards freshness at exactly %i days", (days, earned, passed) => {
    expect(signal("freshness", { updatedAt: daysAgo(days) })).toMatchObject({
      available: 10,
      earned,
      passed
    });
  });

  it("awards availability only to unassigned issues", () => {
    expect(signal("available", { assigneeCount: 0 })).toMatchObject({
      available: 5,
      earned: 5,
      passed: true
    });
    expect(signal("available", { assigneeCount: 1 })).toMatchObject({
      available: 5,
      earned: 0,
      passed: false
    });
  });

  it("returns all signals in stable order with stable evidence keys", () => {
    const assessment = assessIssue(issue(), repository(), NOW);

    expect(assessment.signals.map(({ key }) => key)).toEqual([
      "specific-title",
      "context",
      "bounded-task",
      "acceptance",
      "verification",
      "location",
      "freshness",
      "available"
    ]);
    expect(assessment.signals.map(({ evidence }) => evidence)).toEqual([
      "specific-title:passed",
      "context:missing",
      "bounded-task:missing",
      "acceptance:missing",
      "verification:missing",
      "location:missing",
      "freshness:passed",
      "available:passed"
    ]);
  });
});

describe("date and score invariants", () => {
  const completeBody = [
    "Background: describe the problem context.",
    "Scope and implementation steps:",
    "- [ ] Edit src/parser.ts in the parser module.",
    "Acceptance criteria: expected behavior is documented.",
    "Tests: verify the expected result."
  ].join("\n");
  const invalidDate = new Date(Number.NaN);

  it("rejects an invalid issue date through both assessment entry points", () => {
    const invalidIssue = issue({
      body: completeBody,
      updatedAt: invalidDate
    });

    expect(() => assessIssue(invalidIssue, repository(), NOW)).toThrowError(
      new RangeError("IssueReady scoring requires valid dates")
    );
    expect(() =>
      analyzeRepository(
        {
          repository: repository(),
          issues: [invalidIssue],
          inspectedItemCount: 1,
          apiScopeLimit: 100
        },
        NOW
      )
    ).toThrowError(new RangeError("IssueReady scoring requires valid dates"));
  });

  it("rejects an invalid repository activity date", () => {
    const invalidRepository = repository({ pushedAt: invalidDate });

    expect(() =>
      assessIssue(issue({ body: completeBody }), invalidRepository, NOW)
    ).toThrowError(new RangeError("IssueReady scoring requires valid dates"));
    expect(() =>
      analyzeRepository(
        {
          repository: invalidRepository,
          issues: [],
          inspectedItemCount: 0,
          apiScopeLimit: 100
        },
        NOW
      )
    ).toThrowError(new RangeError("IssueReady scoring requires valid dates"));
  });

  it("rejects an invalid caller-supplied current date", () => {
    expect(() =>
      assessIssue(issue({ body: completeBody }), repository(), invalidDate)
    ).toThrowError(new RangeError("IssueReady scoring requires valid dates"));
    expect(() =>
      analyzeRepository(
        {
          repository: repository(),
          issues: [],
          inspectedItemCount: 0,
          apiScopeLimit: 100
        },
        invalidDate
      )
    ).toThrowError(new RangeError("IssueReady scoring requires valid dates"));
  });

  it("treats valid future issue and repository timestamps as age zero", () => {
    const future = new Date(NOW.getTime() + 30 * DAY_MS);
    const assessment = assessIssue(
      issue({ body: completeBody, updatedAt: future }),
      repository({ pushedAt: future }),
      NOW
    );

    expect(
      assessment.signals.find(({ key }) => key === "freshness")
    ).toMatchObject({
      earned: 10,
      available: 10,
      passed: true
    });
    expect(assessment.score).toBe(100);
    expect(assessment.score).toBeLessThanOrEqual(100);
    expect(assessment.classification).toBe("ready");
    expect(assessment.warnings).toEqual([]);
  });

  it("keeps the score equal to earned points within the fixed 100-point budget", () => {
    const assessment = assessIssue(
      issue({ body: completeBody }),
      repository(),
      NOW
    );

    expect(
      assessment.signals.reduce((sum, item) => sum + item.available, 0)
    ).toBe(100);
    expect(assessment.score).toBe(
      assessment.signals.reduce((sum, item) => sum + item.earned, 0)
    );
    expect(assessment.score).toBeLessThanOrEqual(100);
  });
});

describe("classification", () => {
  const completeBody = [
    "Background: newcomers need clear context for this problem.",
    "Scope and implementation steps:",
    "- [ ] Edit src/parser.ts and the parser module.",
    "Acceptance criteria: expected behavior is documented.",
    "Tests: verify the expected result."
  ].join("\n");

  it("classifies an exact score of 70 as ready", () => {
    const body = `Scope acceptance criteria ${"a".repeat(120)}`;
    const assessment = assessIssue(
      issue({ body, updatedAt: daysAgo(180) }),
      repository(),
      NOW
    );

    expect(assessment.score).toBe(70);
    expect(assessment.classification).toBe("ready");
  });

  it("gives possibly-stale precedence to an issue older than 180 days", () => {
    const assessment = assessIssue(
      issue({ body: completeBody, updatedAt: daysAgo(181) }),
      repository(),
      NOW
    );

    expect(assessment.score).toBeGreaterThanOrEqual(70);
    expect(assessment.classification).toBe("possibly-stale");
  });

  it.each(["blocked", "on hold", "wontfix", "waiting"])(
    "gives possibly-stale precedence to blocking label %s",
    (blockingLabel) => {
      const assessment = assessIssue(
        issue({
          body: completeBody,
          labels: ["good first issue", blockingLabel]
        }),
        repository(),
        NOW
      );

      expect(assessment.score).toBe(100);
      expect(assessment.classification).toBe("possibly-stale");
    }
  );

  it("gives possibly-stale precedence to an archived repository", () => {
    const assessment = assessIssue(
      issue({ body: completeBody }),
      repository({ archived: true }),
      NOW
    );

    expect(assessment.score).toBe(100);
    expect(assessment.classification).toBe("possibly-stale");
    expect(assessment.warnings).toContain("repository-archived");
  });

  it("warns only when repository activity is strictly older than 180 days", () => {
    expect(
      assessIssue(
        issue({ body: completeBody }),
        repository({ pushedAt: daysAgo(180) }),
        NOW
      ).warnings
    ).not.toContain("repository-inactive");

    const inactive = assessIssue(
      issue({ body: completeBody }),
      repository({ pushedAt: daysAgo(181) }),
      NOW
    );
    expect(inactive.classification).toBe("needs-work");
    expect(inactive.warnings).toContain("repository-inactive");
  });

  it.each(["missing", "unknown"] as const)(
    "prevents ready and warns when a prerequisite is %s",
    (fileState) => {
      const assessment = assessIssue(
        issue({ body: completeBody }),
        repository({ contributing: fileState }),
        NOW
      );

      expect(assessment.score).toBe(100);
      expect(assessment.classification).toBe("needs-work");
      expect(assessment.warnings).toEqual(["prerequisites-incomplete"]);
    }
  );

  it("emits each repository warning once in stable order", () => {
    const assessment = assessIssue(
      issue({ body: completeBody }),
      repository({
        archived: true,
        pushedAt: daysAgo(181),
        readme: "missing",
        contributing: "unknown",
        license: "missing"
      }),
      NOW
    );

    expect(assessment.warnings).toEqual([
      "repository-archived",
      "repository-inactive",
      "prerequisites-incomplete"
    ]);
  });

  it("derives missingSignals in the same stable order as failed signals", () => {
    const assessment = assessIssue(
      issue({ title: "fix", assigneeCount: 1 }),
      repository(),
      NOW
    );

    expect(assessment.missingSignals).toEqual(
      assessment.signals.filter(({ passed }) => !passed).map(({ key }) => key)
    );
  });
});

describe("analyzeRepository", () => {
  it("initializes exact zero counts and propagates inspection scope", () => {
    const input: AnalysisInput = {
      repository: repository(),
      issues: [],
      inspectedItemCount: 73,
      apiScopeLimit: 100
    };

    expect(analyzeRepository(input, NOW)).toStrictEqual({
      repository: input.repository,
      assessments: [],
      counts: {
        ready: 0,
        "needs-work": 0,
        "possibly-stale": 0
      },
      inspectedItemCount: 73,
      apiScopeLimit: 100
    });
  });

  it("counts every classification without dropping zero-valued keys", () => {
    const readyBody = [
      "Background and scope details long enough for context.",
      "1. implementation in src/app.ts",
      "Acceptance criteria: done when tests verify expected behavior."
    ].join("\n");
    const input: AnalysisInput = {
      repository: repository(),
      issues: [
        issue({ number: 1, body: readyBody }),
        issue({ number: 2, title: "fix", assigneeCount: 1 }),
        issue({ number: 3, body: readyBody, updatedAt: daysAgo(181) })
      ],
      inspectedItemCount: 100,
      apiScopeLimit: 100
    };

    const report = analyzeRepository(input, NOW);

    expect(report.counts).toStrictEqual({
      ready: 1,
      "needs-work": 1,
      "possibly-stale": 1
    });
    expect(
      report.assessments.map(({ issue: assessedIssue }) => assessedIssue.number)
    ).toEqual([1, 2, 3]);
  });
});
