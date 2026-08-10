# Security policy

## Supported versions

Security fixes are made on the current `main` branch and, when applicable, the latest published release. Older releases may not receive fixes; users should update to the newest available version.

## Report a vulnerability privately

**Do not open, file, or report a suspected vulnerability in a public issue, discussion, or pull request.** Public disclosure can put IssueReady users and other repositories at risk before a fix is available.

Instead:

1. Open this repository's **Security** tab.
2. Select **Report a vulnerability**.
3. Submit the private vulnerability report with the details listed below.

If **Report a vulnerability** is not visible, use a private contact method published by the repository owner. Do not fall back to a public issue. Avoid including secrets, personal access tokens, private-repository data, or personal information in any report.

Please include, when relevant:

- a concise description of the impact;
- the affected commit, release, browser, and operating system;
- the smallest safe reproduction steps;
- whether the problem affects URL validation, GitHub API requests, caching, content rendering, CSP, build/deployment, or dependencies;
- any suggested mitigation;
- whether and where the issue has already been disclosed.

Do not test against repositories or accounts you do not control, do not access private data, and do not perform denial-of-service testing. A report may omit exploit code when the impact and reproduction can be explained safely.

## Scope notes

IssueReady is designed to request only public GitHub data without credentials, render remote content as text rather than HTML, and keep normalized public responses in session storage for no more than ten minutes. Its production Content Security Policy permits cross-origin connections only to `api.github.com`. The documented security boundaries are in [docs/architecture.md](docs/architecture.md).

Reports about compromised browsers or extensions, GitHub itself, third-party repositories, social engineering, or unsupported modified deployments may be outside this repository's control, but a private report is still appropriate when you are unsure whether IssueReady contributes to the risk.

## Disclosure

Please allow maintainers time to investigate and coordinate a fix before public disclosure. Maintainers will use the private report to ask follow-up questions and record remediation when the repository's vulnerability-reporting feature is available. No response-time or bounty commitment is implied.
