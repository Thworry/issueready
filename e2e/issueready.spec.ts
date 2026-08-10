import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import communityFixture from "./fixtures/community.json" with { type: "json" };
import issuesFixture from "./fixtures/issues.json" with { type: "json" };
import repositoryFixture from "./fixtures/repository.json" with { type: "json" };

const REPOSITORY_URL = "https://github.com/issueready/example";
const API_PATTERN = "https://api.github.com/**";
const FIXED_TIME = "2026-08-10T12:00:00.000Z";

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(FIXED_TIME);
});

interface ApiOverrides {
  communityStatus?: number;
  issues?: typeof issuesFixture;
  repository?: typeof repositoryFixture;
  repositoryStatus?: number;
  requests?: string[];
  resetAt?: string;
}

async function mockGitHub(page: Page, overrides: ApiOverrides = {}) {
  await page.route(API_PATTERN, async (route) => {
    const requestUrl = new URL(route.request().url());
    const requestKey = `${requestUrl.pathname}${requestUrl.search}`;
    overrides.requests?.push(requestKey);

    if (requestUrl.pathname.endsWith("/community/profile")) {
      await route.fulfill({
        status: overrides.communityStatus ?? 200,
        json: communityFixture
      });
      return;
    }

    if (requestUrl.pathname.endsWith("/issues")) {
      await route.fulfill({
        status: 200,
        json: overrides.issues ?? issuesFixture
      });
      return;
    }

    const status = overrides.repositoryStatus ?? 200;
    await route.fulfill({
      status,
      headers:
        status === 403 && overrides.resetAt
          ? {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Expose-Headers": "X-RateLimit-Reset",
              "X-RateLimit-Reset": overrides.resetAt
            }
          : undefined,
      json:
        status === 200
          ? (overrides.repository ?? repositoryFixture)
          : { message: status === 404 ? "Not Found" : "API rate limit" }
    });
  });
}

async function analyze(page: Page) {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Public GitHub repository" })
    .fill(REPOSITORY_URL);
  await page.getByRole("button", { name: "Analyze repository" }).click();
  await expect(
    page.getByRole("heading", { name: "Issue readiness report" })
  ).toBeVisible();
}

async function expectNoSeriousAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(
    results.violations.filter(
      (item) => item.impact === "serious" || item.impact === "critical"
    )
  ).toEqual([]);
}

async function tabTo(page: Page, target: Locator) {
  for (let step = 0; step < 20; step += 1) {
    await page.keyboard.press("Tab");
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      return;
    }
  }
  throw new Error(
    `Keyboard focus did not reach ${await target.count()} target`
  );
}

async function expectPressedFeedback(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error("Expected a visible press target");

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  let feedback: { maxDuration: number; translateY: number } | undefined;
  try {
    await page.mouse.down();
    await expect
      .poll(
        () =>
          target.evaluate(
            (element) =>
              new DOMMatrixReadOnly(getComputedStyle(element).transform).m42
          ),
        { timeout: 1_000 }
      )
      .toBeGreaterThan(0);
    feedback = await target.evaluate((element) => {
      const style = getComputedStyle(element);
      const matrix = new DOMMatrixReadOnly(style.transform);
      const durations = style.transitionDuration.split(",").map((value) => {
        const duration = value.trim();
        return duration.endsWith("ms")
          ? Number.parseFloat(duration)
          : Number.parseFloat(duration) * 1_000;
      });
      return { maxDuration: Math.max(...durations), translateY: matrix.m42 };
    });
  } finally {
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }

  expect(feedback).toBeDefined();
  if (!feedback) return;
  expect(feedback.translateY).toBeGreaterThan(0);
  expect(feedback.translateY).toBeLessThanOrEqual(1);
  expect(feedback.maxDuration).toBeLessThanOrEqual(160);
}

test("landing page has no serious or critical axe violations", async ({
  page
}) => {
  await mockGitHub(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "IssueReady" })).toBeVisible();
  await expectNoSeriousAxeViolations(page);
});

test("analyzes one ready and one needs-work issue", async ({ page }) => {
  await mockGitHub(page);
  await analyze(page);

  expect(await page.evaluate(() => new Date().toISOString())).toBe(FIXED_TIME);

  const ready = page.getByRole("article", {
    name: "#1 Document the contribution setup workflow"
  });
  const needsWork = page.getByRole("article", { name: "#2 Help" });
  await expect(ready.getByText("Ready", { exact: true })).toBeVisible();
  await expect(
    needsWork.getByText("Needs work", { exact: true })
  ).toBeVisible();
  await expect(needsWork.getByText("Assigned to 1 person")).toBeVisible();
  await expect(
    page.getByText("Pull request returned by the issues endpoint")
  ).toHaveCount(0);
  await expectPressedFeedback(
    page,
    page.getByRole("link", { name: "How scoring works" })
  );
  await expectPressedFeedback(
    page,
    needsWork.getByRole("link", { name: "Open on GitHub" })
  );
  await expectPressedFeedback(
    page,
    page.getByRole("button", { name: "All issues 2" })
  );
  await expectPressedFeedback(
    page,
    needsWork.getByRole("button", { name: "Copy improvement checklist" })
  );
  await expectNoSeriousAxeViolations(page);
});

test("supports a keyboard-only form and classification filter flow", async ({
  page
}) => {
  await mockGitHub(page);
  await page.goto("/");

  const input = page.getByRole("textbox", {
    name: "Public GitHub repository"
  });
  await tabTo(page, input);
  await page.keyboard.type(REPOSITORY_URL);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Analyze repository" })
  ).toBeFocused();
  await page.keyboard.press("Enter");

  const needsWorkFilter = page.getByRole("button", { name: "Needs work 1" });
  await expect(needsWorkFilter).toBeVisible();
  await tabTo(page, needsWorkFilter);
  await page.keyboard.press("Enter");

  await expect(page.getByRole("article", { name: "#2 Help" })).toBeVisible();
  await expect(
    page.getByRole("article", {
      name: "#1 Document the contribution setup workflow"
    })
  ).toHaveCount(0);
});

test("keeps the full report inside supported viewports with usable targets", async ({
  page
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockGitHub(page);
  await analyze(page);

  for (const viewport of [
    { width: 375, height: 812 },
    { width: 900, height: 900 },
    { width: 1366, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);

    const undersized = await page
      .locator("a, button, input")
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              rect.width > 0 &&
              rect.height > 0
            );
          })
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              label:
                element.textContent?.trim() ||
                element.getAttribute("aria-label"),
              width: rect.width,
              height: rect.height
            };
          })
          .filter(({ width, height }) => width < 44 || height < 44)
      );
    expect(undersized).toEqual([]);
  }
});

test("opens a shared repository query automatically", async ({ page }) => {
  await mockGitHub(page);
  await page.goto("/?repo=issueready%2Fexample");

  await expect(
    page.getByRole("heading", { name: "Issue readiness report" })
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Public GitHub repository" })
  ).toHaveValue(REPOSITORY_URL);
});

test("renders the explicit repository 404 state", async ({ page }) => {
  await mockGitHub(page, { repositoryStatus: 404 });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Public GitHub repository" })
    .fill("https://github.com/issueready/missing");
  await page.getByRole("button", { name: "Analyze repository" }).click();

  await expect(
    page.getByRole("heading", {
      name: "GitHub returned 404 for this repository."
    })
  ).toBeVisible();
  await expectPressedFeedback(
    page,
    page.getByRole("button", { name: "Try again" })
  );
});

test("renders rate-limit reset guidance and documentation", async ({
  page
}) => {
  await mockGitHub(page, {
    repositoryStatus: 403,
    resetAt: "1786386600"
  });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Public GitHub repository" })
    .fill(REPOSITORY_URL);
  await page.getByRole("button", { name: "Analyze repository" }).click();

  await expect(
    page.getByRole("heading", { name: "GitHub request limit reached." })
  ).toBeVisible();
  await expect(page.getByText(/^Try again after /)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "GitHub rate limit documentation" })
  ).toBeVisible();
});

test("continues with unavailable prerequisites after community failure", async ({
  page
}) => {
  await mockGitHub(page, { communityStatus: 500 });
  await analyze(page);

  await expect(
    page.locator(".repository-summary__prerequisites").getByText("Unavailable")
  ).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Needs work 2" })
  ).toBeVisible();
  await expect(
    page.getByText("Contributor prerequisites are incomplete or unavailable")
  ).toHaveCount(2);
});

test("renders hostile remote text literally without executing it", async ({
  page
}) => {
  const hostileTitle = "Render <img src=x onerror=window.__pwned=true> as text";
  const hostileDescription =
    "<script>window.__pwned=true</script> Public repository description";
  const hostileIssues = structuredClone(issuesFixture);
  hostileIssues[0].title = hostileTitle;
  const hostileRepository = {
    ...repositoryFixture,
    description: hostileDescription
  };
  await mockGitHub(page, {
    issues: hostileIssues,
    repository: hostileRepository
  });
  await analyze(page);

  await expect(page.getByText(hostileTitle)).toBeVisible();
  await expect(page.getByText(hostileDescription)).toBeVisible();
  await expect(page.locator("main img, main script")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => "__pwned" in window)).toBe(false);
});

test("force refresh makes exactly three additional API requests", async ({
  page
}) => {
  const requests: string[] = [];
  await mockGitHub(page, { requests });
  await analyze(page);
  expect(requests).toHaveLength(3);

  await page.getByRole("button", { name: "Refresh public data" }).click();
  await expect.poll(() => requests.length).toBe(6);
  await expect(
    page.getByRole("heading", { name: "Issue readiness report" })
  ).toBeVisible();

  const refreshedRequests = requests.slice(3);
  expect(refreshedRequests).toHaveLength(3);
  expect(new Set(refreshedRequests).size).toBe(3);
});
