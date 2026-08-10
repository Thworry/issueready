import { describe, expect, it } from "vitest";
import {
  RepoUrlError,
  parseGitHubRepoUrl,
  repoRefFromSearch,
  toShareSearch
} from "./repo-url";

describe("parseGitHubRepoUrl", () => {
  it.each([
    ["https://github.com/ossf/scorecard", { owner: "ossf", repo: "scorecard" }],
    ["github.com/ossf/scorecard", { owner: "ossf", repo: "scorecard" }],
    [
      "https://github.com/ossf/scorecard/",
      { owner: "ossf", repo: "scorecard" }
    ],
    [
      "https://github.com/ossf/scorecard.git",
      { owner: "ossf", repo: "scorecard" }
    ]
  ])("normalizes %s", (input, expected) => {
    expect(parseGitHubRepoUrl(input)).toEqual(expected);
  });

  it.each([
    ["an empty value", ""],
    ["a non-GitHub host", "https://gitlab.com/ossf/scorecard"],
    ["a missing repository", "https://github.com/ossf"],
    ["an extra path", "https://github.com/ossf/scorecard/issues"],
    ["embedded credentials", "https://user:secret@github.com/ossf/scorecard"],
    ["a query", "https://github.com/ossf/scorecard?tab=readme"],
    ["a hash", "https://github.com/ossf/scorecard#readme"],
    ["an empty query delimiter", "https://github.com/ossf/scorecard?"],
    ["an empty hash delimiter", "https://github.com/ossf/scorecard#"],
    ["internal owner whitespace", "https://github.com/open source/scorecard"],
    ["internal repository whitespace", "https://github.com/ossf/score card"],
    ["an insecure protocol", "http://github.com/ossf/scorecard"],
    ["a non-default port", "https://github.com:444/ossf/scorecard"],
    ["an out-of-range port", "https://github.com:999999/ossf/scorecard"],
    [
      "duplicate separators after the host",
      "https://github.com//ossf/scorecard"
    ],
    ["duplicate path separators", "https://github.com/ossf//scorecard"],
    ["a dot-segment path", "https://github.com/ossf/extra/../scorecard"],
    ["backslash separators", "https://github.com\\ossf\\scorecard"]
  ])("rejects %s", (_label, input) => {
    expect(() => parseGitHubRepoUrl(input)).toThrow(RepoUrlError);
  });

  it("trims harmless leading and trailing input whitespace", () => {
    expect(parseGitHubRepoUrl("  github.com/ossf/scorecard  ")).toEqual({
      owner: "ossf",
      repo: "scorecard"
    });
  });
});

describe("repository share search", () => {
  it("round-trips a valid repository reference", () => {
    const ref = { owner: "open-sauced", repo: "app.dev" };
    const search = toShareSearch(ref);

    expect(search).toBe("?repo=open-sauced%2Fapp.dev");
    expect(repoRefFromSearch(search)).toEqual(ref);
  });

  it.each([
    "",
    "?repo=",
    "?repo=ossf",
    "?repo=ossf/scorecard/issues",
    "?repo=bad owner/scorecard",
    "?repo=ossf/",
    "?repo=ossf/.",
    "?repo=ossf/..",
    "?repo=ossf/scorecard&repo=evil/repo"
  ])("returns null for invalid search input %s", (search) => {
    expect(repoRefFromSearch(search)).toBeNull();
  });
});
