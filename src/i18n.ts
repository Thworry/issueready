import type {
  Classification,
  FileState,
  Language,
  SignalKey
} from "./features/analyzer/model";

export interface Messages {
  brand: string;
  tagline: string;
  intro: string;
  scope: string;
  languageLabel: string;
  english: string;
  chinese: string;
  formLabel: string;
  formPlaceholder: string;
  formHelp: string;
  submit: string;
  loading: Record<"validating" | "reading" | "assessing", string>;
  examples: string;
  privacy: string;
  methodology: string;
  refresh: string;
  openGitHub: string;
  copyChecklist: string;
  copied: string;
  copyFailed: string;
  all: string;
  scoreLabel: string;
  repositoryFiles: string;
  readme: string;
  contributing: string;
  license: string;
  classifications: Record<Classification, string>;
  signals: Record<SignalKey, string>;
  fileStates: Record<FileState, string>;
  warnings: Record<
    "repository-archived" | "repository-inactive" | "prerequisites-incomplete",
    string
  >;
  errors: Record<
    "invalid-url" | "not-found" | "rate-limit" | "network" | "api" | "unknown",
    string
  >;
  emptyTitle: string;
  emptyBody: string;
  searchedLabels: string;
  scopeNotice: string;
  resultCount: (count: number) => string;
  rateLimitReset: (time: string) => string;
}

const en: Messages = {
  brand: "IssueReady",
  tagline: "Prepare beginner issues before contributors find them.",
  intro:
    "A maintainer-side pre-publish check for context, scope, acceptance criteria, verification, freshness, triage, and contributor onboarding.",
  scope:
    " helps people understand a repository before adoption; IssueReady helps maintainers prepare actionable issues.",
  languageLabel: "Language",
  english: "English",
  chinese: "Simplified Chinese",
  formLabel: "Public GitHub repository",
  formPlaceholder: "https://github.com/owner/repository",
  formHelp: "Paste the full URL of a public github.com repository.",
  submit: "Analyze repository",
  loading: {
    validating: "Validating repository",
    reading: "Reading public GitHub data",
    assessing: "Assessing beginner issues"
  },
  examples: "Try an example",
  privacy: "Read-only. No login. Data stays between your browser and GitHub.",
  methodology: "How scoring works",
  refresh: "Refresh public data",
  openGitHub: "Open on GitHub",
  copyChecklist: "Copy improvement checklist",
  copied: "Copied",
  copyFailed: "Could not copy",
  all: "All issues",
  scoreLabel: "Readiness score",
  repositoryFiles: "Contributor prerequisites",
  readme: "README",
  contributing: "Contribution guide",
  license: "License",
  classifications: {
    ready: "Ready",
    "needs-work": "Needs work",
    "possibly-stale": "Possibly stale"
  },
  signals: {
    "specific-title": "Specific title",
    context: "Context",
    "bounded-task": "Bounded task",
    acceptance: "Acceptance criteria",
    verification: "Verification",
    location: "Location hint",
    freshness: "Freshness",
    available: "Available to claim"
  },
  fileStates: {
    present: "Present",
    missing: "Missing",
    unknown: "Unavailable"
  },
  warnings: {
    "repository-archived": "Repository is archived",
    "repository-inactive": "No repository push in more than 180 days",
    "prerequisites-incomplete":
      "Contributor prerequisites are incomplete or unavailable"
  },
  errors: {
    "invalid-url":
      "Enter a public GitHub repository URL such as https://github.com/ossf/scorecard",
    "not-found":
      "GitHub could not find this public repository. It may be missing or private.",
    "rate-limit": "GitHub request limit reached.",
    network: "GitHub could not be reached. Check your connection and retry.",
    api: "GitHub returned an unexpected response.",
    unknown: "IssueReady could not complete the check."
  },
  emptyTitle: "No beginner-labelled issues found",
  emptyBody:
    "Add a supported label to a bounded issue, then run the check again.",
  searchedLabels: "Labels checked",
  scopeNotice:
    "IssueReady inspected only the 100 most recently updated open items returned by GitHub and removed pull requests locally. Older issues may be omitted.",
  resultCount: (count) => `${count} ${count === 1 ? "issue" : "issues"}`,
  rateLimitReset: (time) => `Try again after ${time}`
};

const zhCN: Messages = {
  brand: "IssueReady",
  tagline: "在贡献者看到任务之前，先把新手 Issue 准备好。",
  intro:
    "面向维护者的发布前检查，核对背景、范围、验收标准、验证方法、时效、分诊和贡献者上手条件。",
  scope:
    " 帮助准备采用项目的人先看懂整个仓库；IssueReady 帮助维护者把具体任务整理成可执行的 Issue。",
  languageLabel: "语言",
  english: "英文",
  chinese: "简体中文",
  formLabel: "公开 GitHub 仓库",
  formPlaceholder: "https://github.com/owner/repository",
  formHelp: "粘贴公开 github.com 仓库的完整地址。",
  submit: "分析仓库",
  loading: {
    validating: "正在验证仓库",
    reading: "正在读取 GitHub 公开数据",
    assessing: "正在评估新手任务"
  },
  examples: "查看示例",
  privacy: "只读、无需登录；数据仅在你的浏览器与 GitHub 之间传输。",
  methodology: "评分方法",
  refresh: "刷新公开数据",
  openGitHub: "在 GitHub 打开",
  copyChecklist: "复制完善清单",
  copied: "已复制",
  copyFailed: "复制失败",
  all: "全部任务",
  scoreLabel: "准备度得分",
  repositoryFiles: "参与前提",
  readme: "README",
  contributing: "贡献指南",
  license: "许可证",
  classifications: {
    ready: "可以开始",
    "needs-work": "需要完善",
    "possibly-stale": "可能已过期"
  },
  signals: {
    "specific-title": "标题明确",
    context: "问题背景",
    "bounded-task": "任务范围",
    acceptance: "验收标准",
    verification: "验证方法",
    location: "位置提示",
    freshness: "更新时间",
    available: "可以领取"
  },
  fileStates: {
    present: "已提供",
    missing: "缺失",
    unknown: "暂时无法读取"
  },
  warnings: {
    "repository-archived": "仓库已归档",
    "repository-inactive": "仓库超过 180 天没有推送",
    "prerequisites-incomplete": "参与前提缺失或暂时无法读取"
  },
  errors: {
    "invalid-url":
      "请输入公开 GitHub 仓库地址，例如 https://github.com/ossf/scorecard",
    "not-found": "GitHub 找不到这个公开仓库；它可能不存在或属于私有仓库。",
    "rate-limit": "已达到 GitHub 请求限制。",
    network: "无法连接 GitHub，请检查网络后重试。",
    api: "GitHub 返回了意外响应。",
    unknown: "IssueReady 无法完成检查。"
  },
  emptyTitle: "未找到带新手标签的任务",
  emptyBody: "为范围明确的任务添加受支持标签，然后重新检查。",
  searchedLabels: "已检查标签",
  scopeNotice:
    "IssueReady 仅检查 GitHub 返回的最近更新 100 个开放条目，并在本地排除拉取请求；更早的任务可能未包含。",
  resultCount: (count) => `${count} 个任务`,
  rateLimitReset: (time) => `请在 ${time} 后重试`
};

export const messages: Record<Language, Messages> = {
  en,
  "zh-CN": zhCN
};
