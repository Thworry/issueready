import { describe, expect, it } from "vitest";
import type {
  GitHubCommunityProfile,
  GitHubIssue,
  RepoSnapshot
} from "./model";
import { normalizeLabel, normalizeSnapshot, stripMarkdown } from "./normalize";

const presentFile = {
  url: "https://api.github.com/repos/acme/tool/readme",
  html_url: "https://github.com/acme/tool/blob/main/README.md"
};

const community: GitHubCommunityProfile = {
  health_percentage: 67,
  files: {
    readme: presentFile,
    contributing: null,
    license: null
  }
};

function issue(
  number: number,
  label: GitHubIssue["labels"][number],
  overrides: Partial<GitHubIssue> = {}
): GitHubIssue {
  return {
    number,
    title: ` Issue ${number} needs a precise title `,
    html_url: `https://github.com/acme/tool/issues/${number}`,
    body: `Body for issue ${number}`,
    labels: [label],
    updated_at: `2026-08-0${number}T12:30:00Z`,
    assignees: [],
    ...overrides
  };
}

function snapshot(
  issues: GitHubIssue[],
  profile: GitHubCommunityProfile | null = community
): RepoSnapshot {
  return {
    repository: {
      full_name: "acme/tool",
      html_url: "https://github.com/acme/tool",
      description: null,
      archived: false,
      pushed_at: "2026-08-08T09:15:00Z",
      open_issues_count: 27,
      default_branch: "main"
    },
    community: profile,
    issues
  };
}

describe("normalizeLabel", () => {
  it("lowercases and turns hyphenated or underscored labels into single spaces", () => {
    expect(normalizeLabel("  Good-First_Issue  ")).toBe("good first issue");
  });
});

describe("stripMarkdown", () => {
  it("removes HTML and Markdown syntax while retaining visible text", () => {
    const markdown =
      "# **Heading** <strong>Important</strong> ![Alt text](image.png) [Docs](https://example.com) `code`";

    expect(stripMarkdown(markdown)).toBe(
      "Heading Important Alt text Docs code"
    );
  });
});

describe("normalizeSnapshot", () => {
  it("keeps exactly the five candidate label families and excludes pull requests", () => {
    const input = snapshot([
      issue(1, "Good-First_Issue"),
      issue(2, { name: "FIRST_TIMERS-only" }),
      issue(3, " beginner "),
      issue(4, { name: "Beginner__Friendly" }),
      issue(5, "help-wanted"),
      issue(6, "first timer only"),
      issue(7, "bug"),
      issue(8, "good first issue", { pull_request: { url: "api/pr/8" } })
    ]);

    const result = normalizeSnapshot(input);

    expect(result.issues.map(({ number }) => number)).toEqual([1, 2, 3, 4, 5]);
    expect(result.issues.map(({ labels }) => labels[0])).toEqual([
      "good first issue",
      "first timers only",
      "beginner",
      "beginner friendly",
      "help wanted"
    ]);
    expect(result.inspectedItemCount).toBe(8);
    expect(result.apiScopeLimit).toBe(100);
  });

  it("normalizes repository, issue counts, dates, bodies, labels, and file states", () => {
    const input = snapshot([
      issue(1, "Good-First_Issue", {
        body: null,
        labels: ["Good-First_Issue", { name: "Needs__Docs" }],
        assignees: [{ login: "octocat" }, { login: "hubot" }]
      })
    ]);

    const result = normalizeSnapshot(input);

    expect(result.repository).toStrictEqual({
      fullName: "acme/tool",
      url: "https://github.com/acme/tool",
      description: null,
      archived: false,
      pushedAt: new Date("2026-08-08T09:15:00Z"),
      openItemCount: 27,
      readme: "present",
      contributing: "missing",
      license: "missing"
    });
    expect(result.issues).toStrictEqual([
      {
        number: 1,
        title: "Issue 1 needs a precise title",
        url: "https://github.com/acme/tool/issues/1",
        body: "",
        labels: ["good first issue", "needs docs"],
        updatedAt: new Date("2026-08-01T12:30:00Z"),
        assigneeCount: 2
      }
    ]);
  });

  it("preserves raw remote body text as plain data for later safe rendering", () => {
    const hostileBody = "<img src=x onerror=alert(1)> **visible**";

    const result = normalizeSnapshot(
      snapshot([issue(1, "help wanted", { body: hostileBody })])
    );

    expect(result.issues[0]?.body).toBe(hostileBody);
    expect(stripMarkdown(result.issues[0]?.body ?? "")).toBe("visible");
  });

  it("marks all community file states unknown when the profile is unavailable", () => {
    const result = normalizeSnapshot(snapshot([issue(1, "beginner")], null));

    expect(result.repository).toMatchObject({
      readme: "unknown",
      contributing: "unknown",
      license: "unknown"
    });
  });
});
