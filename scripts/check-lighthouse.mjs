import console from "node:console";
import { spawn } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { clearTimeout, setTimeout as scheduleTimeout } from "node:timers";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";

import { chromium } from "@playwright/test";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

export const LIGHTHOUSE_CATEGORIES = [
  "performance",
  "accessibility",
  "best-practices",
  "seo"
];
export const LIGHTHOUSE_MINIMUM_SCORE = 0.95;
export const LIGHTHOUSE_RUNS = 3;

const HOST = "127.0.0.1";
const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUTPUT_DIRECTORY = path.join(PROJECT_ROOT, ".lighthouseci");
const VITE_CLI = path.join(PROJECT_ROOT, "node_modules/vite/bin/vite.js");

const childHasExited = (child) =>
  child.exitCode !== null || child.signalCode !== null;

const formatScore = (score) => score.toFixed(2);

export function enforceCategoryThresholds(results) {
  if (results.length !== LIGHTHOUSE_RUNS) {
    throw new Error(
      `Expected ${LIGHTHOUSE_RUNS} Lighthouse runs, received ${results.length}`
    );
  }

  const failures = [];

  results.forEach((result, runIndex) => {
    for (const category of LIGHTHOUSE_CATEGORIES) {
      const score = result.categories?.[category]?.score;

      if (typeof score !== "number" || !Number.isFinite(score)) {
        failures.push(`run ${runIndex + 1} ${category}: score unavailable`);
      } else if (score < LIGHTHOUSE_MINIMUM_SCORE) {
        failures.push(
          `run ${runIndex + 1} ${category}: ${formatScore(score)} < ${formatScore(LIGHTHOUSE_MINIMUM_SCORE)}`
        );
      }
    }
  });

  if (failures.length > 0) {
    throw new Error(`Lighthouse threshold failures:\n${failures.join("\n")}`);
  }
}

export function createPreviewSpawnSpec(port) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new TypeError("Preview port must be an integer from 1 through 65535");
  }

  return {
    command: process.execPath,
    args: [
      VITE_CLI,
      "preview",
      "--host",
      HOST,
      "--port",
      String(port),
      "--strictPort"
    ],
    options: {
      cwd: PROJECT_ROOT,
      shell: false,
      stdio: ["ignore", "inherit", "inherit"]
    }
  };
}

export function startPreviewServer(port) {
  const { command, args, options } = createPreviewSpawnSpec(port);
  return spawn(command, args, options);
}

export async function findAvailablePort() {
  const server = createServer();
  server.unref();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: HOST, port: 0 }, resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not allocate a local preview port");
  }

  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return address.port;
}

export async function waitForHttpServer(
  url,
  child,
  timeoutMilliseconds = 15_000
) {
  const deadline = Date.now() + timeoutMilliseconds;

  while (Date.now() < deadline) {
    if (childHasExited(child)) {
      throw new Error(
        `Vite preview exited before becoming ready (code ${String(child.exitCode)}, signal ${String(child.signalCode)})`
      );
    }

    try {
      const response = await globalThis.fetch(url);
      if (response.ok) return;
    } catch {
      // The preview process may still be starting.
    }

    await delay(100);
  }

  throw new Error(`Timed out waiting for Vite preview at ${url}`);
}

async function waitForChildExit(child, timeoutMilliseconds) {
  if (childHasExited(child)) return true;

  return new Promise((resolve) => {
    let timeout;
    const finish = (exited) => {
      child.removeListener("exit", handleExit);
      clearTimeout(timeout);
      resolve(exited);
    };
    const handleExit = () => finish(true);

    child.once("exit", handleExit);
    if (childHasExited(child)) {
      finish(true);
      return;
    }
    timeout = scheduleTimeout(() => finish(false), timeoutMilliseconds);
  });
}

export async function stopChildProcess(child, gracePeriodMilliseconds = 2_000) {
  if (childHasExited(child)) return;

  child.kill("SIGTERM");
  if (await waitForChildExit(child, gracePeriodMilliseconds)) return;

  child.kill("SIGKILL");
  if (!(await waitForChildExit(child, 1_000))) {
    throw new Error(`Could not stop preview process ${String(child.pid)}`);
  }
}

export async function withPreviewServer(callback, dependencies = {}) {
  const findPort = dependencies.findPort ?? findAvailablePort;
  const startServer = dependencies.startServer ?? startPreviewServer;
  const waitForReady = dependencies.waitForReady ?? waitForHttpServer;
  const stopServer = dependencies.stopServer ?? stopChildProcess;

  const port = await findPort();
  const url = `http://${HOST}:${port}/`;
  const child = startServer(port);
  let stopPromise;
  const stopOnce = () => {
    stopPromise ??= Promise.resolve(stopServer(child));
    return stopPromise;
  };

  const forwardSignal = (signal) => {
    void stopOnce().finally(() => {
      process.removeListener("SIGINT", handleInterrupt);
      process.removeListener("SIGTERM", handleTermination);
      process.kill(process.pid, signal);
    });
  };
  const handleInterrupt = () => forwardSignal("SIGINT");
  const handleTermination = () => forwardSignal("SIGTERM");
  process.once("SIGINT", handleInterrupt);
  process.once("SIGTERM", handleTermination);

  try {
    await waitForReady(url, child);
    return await callback(url);
  } finally {
    process.removeListener("SIGINT", handleInterrupt);
    process.removeListener("SIGTERM", handleTermination);
    await stopOnce();
  }
}

async function writeRunReports(runNumber, report) {
  const reports = Array.isArray(report) ? report : [report];
  const [htmlReport, jsonReport] = reports;

  if (typeof htmlReport !== "string" || typeof jsonReport !== "string") {
    throw new Error(`Lighthouse run ${runNumber} did not return both reports`);
  }

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await Promise.all([
    writeFile(
      path.join(OUTPUT_DIRECTORY, `run-${runNumber}.report.html`),
      htmlReport
    ),
    writeFile(
      path.join(OUTPUT_DIRECTORY, `run-${runNumber}.report.json`),
      jsonReport
    )
  ]);
}

async function runAudits(url) {
  const chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ["--headless=new"]
  });
  const results = [];

  try {
    for (let runIndex = 0; runIndex < LIGHTHOUSE_RUNS; runIndex += 1) {
      const runNumber = runIndex + 1;
      const result = await lighthouse(url, {
        logLevel: "error",
        onlyCategories: LIGHTHOUSE_CATEGORIES,
        output: ["html", "json"],
        port: chrome.port
      });

      if (!result) {
        throw new Error(`Lighthouse run ${runNumber} returned no result`);
      }
      if (result.lhr.runtimeError) {
        throw new Error(
          `Lighthouse run ${runNumber} failed: ${result.lhr.runtimeError.message}`
        );
      }

      results.push(result.lhr);
      await writeRunReports(runNumber, result.report);

      const summary = LIGHTHOUSE_CATEGORIES.map((category) => {
        const score = result.lhr.categories[category]?.score;
        return `${category}=${typeof score === "number" ? formatScore(score) : "unavailable"}`;
      }).join(", ");
      console.log(`Lighthouse run ${runNumber}/${LIGHTHOUSE_RUNS}: ${summary}`);
    }
  } finally {
    await chrome.kill();
  }

  enforceCategoryThresholds(results);
  console.log(
    `All ${LIGHTHOUSE_RUNS} Lighthouse runs meet the ${LIGHTHOUSE_MINIMUM_SCORE.toFixed(2)} category threshold.`
  );
}

async function main() {
  try {
    await access(path.join(PROJECT_ROOT, "dist/index.html"));
  } catch {
    throw new Error("dist/index.html is missing; run pnpm build first");
  }

  await withPreviewServer(runAudits);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
