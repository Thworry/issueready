# IssueReady

[English](README.md)

IssueReady 用来检查公开 GitHub 仓库中带新手标签的任务是否清晰、及时、可执行。它会生成一份中英双语的只读报告，提供可解释的评分、贡献前提检查，以及可复制的完善清单。

分析过程采用固定规则，不使用 AI 判断任务，也不声称高分任务一定安全、正确，或一定会被维护者接受。

## 使用 IssueReady

1. 打开已部署的 IssueReady 网站。
2. 粘贴完整的公开仓库地址，例如 `https://github.com/ossf/scorecard`。
3. 选择**分析仓库**。
4. 查看仓库参与前提、筛选任务卡片、在 GitHub 打开原任务，或复制缺失项清单。
5. 需要跳过十分钟缓存时，使用**刷新公开数据**。

手动分析成功后，地址栏会生成可分享的 `?repo=owner%2Frepository` 查询参数。打开该地址会自动执行同一项公开分析。IssueReady 只接受公开的 `https://github.com/owner/repository` 地址，不能读取私有仓库。

IssueReady 会检查带有以下任一规范化标签的任务：

- `good first issue`
- `first timers only`
- `beginner`
- `beginner friendly`
- `help wanted`

标签中的连字符和下划线会转换为空格，匹配不区分大小写。

## 如何理解报告

每个候选任务都会通过八项可见检查获得满分 100 分的评分：标题明确、问题背景、任务范围、验收标准、验证方法、位置提示、更新时间和可以领取。报告将任务分类为**可以开始**、**需要完善**或**可能已过期**；过期规则优先于分数。

规则版本 `1.0.0` 的全部权重、词典、边界、前提条件和优先级都记录在[评分方法](docs/methodology.md)中。报告只是维护辅助信息，并非自动化贡献政策；请始终阅读目标仓库自己的指南，并与维护者确认。

## 范围与限制

- 每次全新分析最多发起三次未经身份验证的只读 GitHub REST API 请求。
- 只检查 GitHub 返回的最近更新 100 个开放条目，并在本地排除拉取请求；更早的任务可能不会出现。
- 受 GitHub 未认证 API 请求限制约束。GitHub 提供重置时间时，IssueReady 会显示该时间；否则请稍后重试或等待限制重置。
- 如果 GitHub 社区资料接口不可用，README、贡献指南和许可证会显示为**暂时无法读取**，不会被误报为已确认缺失。
- 检查属于文本启发式规则，不会执行代码、遍历完整仓库文件树、判断技术难度或预测维护者决定。
- 只支持公开数据，不提供登录或个人访问令牌输入。

## 隐私与安全

IssueReady 没有后端、账号系统、数据分析、广告或遥测。仓库数据只在你的浏览器与 `api.github.com` 之间直接传输。公开响应的规范化副本会在当前浏览器会话中保存不超过十分钟，用于避免重复 API 请求。仓库标识可能出现在可分享的页面地址中。

远程任务正文只供本地评分规则使用，绝不会作为 HTML 渲染。React 会把远程标题、标签和说明当作文本显示。生产构建会应用严格的内容安全策略，且不加载远程字体、脚本或图片。详见[架构与威胁边界](docs/architecture.md)。

如果怀疑存在安全漏洞，请按照[私密报告说明](SECURITY.md)操作。不要在公开 issue 中披露漏洞。

## 本地开发

环境要求：

- Node.js 24.x
- pnpm 11.16.0

安装依赖和 Playwright 浏览器：

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
```

启动开发服务器：

```bash
pnpm dev
```

项目主要命令如下：

```bash
pnpm lint
pnpm format:check
pnpm test
pnpm test:coverage
pnpm build
pnpm check:bundle
pnpm test:e2e
pnpm check:lighthouse
pnpm check
```

`pnpm check` 会运行代码检查、格式检查、单元/组件测试和生产构建。运行包体积检查和 Lighthouse 前，请先执行 `pnpm build`。端到端命令会通过 Playwright 配置自行构建并启动应用。

## 部署

仓库包含 GitHub Pages 工作流。推送到 `main` 或手动触发工作流时，会执行质量门禁、使用仓库专属基础路径构建、上传 `dist`，然后部署到 GitHub Pages。请在仓库设置中将 Pages 来源设为 **GitHub Actions**。部署不需要服务器或运行时密钥。

部署到其他静态托管服务时，运行 `pnpm build` 并发布 `dist`。如果网站位于子路径下，请在构建时设置 `ISSUEREADY_BASE_PATH`。

## 参与贡献

欢迎符合只读、确定性产品范围的聚焦贡献。提交拉取请求前，请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 并遵守[行为准则](CODE_OF_CONDUCT.md)。修改规则时，必须同步更新测试、用户可见的双语文案以及[评分方法](docs/methodology.md)。

请不要为了展示而创建虚假的 `good first issue`。只有仓库确实准备好支持、且工作范围明确时，才使用该标签。

## 许可证

IssueReady 使用 [MIT 许可证](LICENSE)。
