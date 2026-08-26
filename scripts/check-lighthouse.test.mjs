import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import process from "node:process";
import test from "node:test";

import {
  LIGHTHOUSE_CATEGORIES,
  LIGHTHOUSE_MINIMUM_SCORE,
  LIGHTHOUSE_RUNS,
  createChromeLaunchOptions,
  createPreviewSpawnSpec,
  createSignalCleanupManager,
  enforceCategoryThresholds,
  stopChildProcess,
  withPreviewServer
} from "./check-lighthouse.mjs";

const passingCategories = (score = LIGHTHOUSE_MINIMUM_SCORE) =>
  Object.fromEntries(
    LIGHTHOUSE_CATEGORIES.map((category) => [category, { score }])
  );

test("keeps three runs and a 0.95 threshold for every category", () => {
  assert.equal(LIGHTHOUSE_RUNS, 3);
  assert.equal(LIGHTHOUSE_MINIMUM_SCORE, 0.95);
  assert.deepEqual(LIGHTHOUSE_CATEGORIES, [
    "performance",
    "accessibility",
    "best-practices",
    "seo"
  ]);
});

test("accepts every category at the exact threshold in every run", () => {
  assert.doesNotThrow(() =>
    enforceCategoryThresholds([
      { categories: passingCategories() },
      { categories: passingCategories(0.98) },
      { categories: passingCategories(1) }
    ])
  );
});

test("reports the run and category when a score is below the threshold", () => {
  const secondRun = passingCategories();
  secondRun.performance = { score: 0.94 };

  assert.throws(
    () =>
      enforceCategoryThresholds([
        { categories: passingCategories() },
        { categories: secondRun },
        { categories: passingCategories() }
      ]),
    /run 2 performance: 0\.94 < 0\.95/
  );
});

test("rejects a missing category score", () => {
  const incompleteRun = passingCategories();
  delete incompleteRun.seo;

  assert.throws(
    () =>
      enforceCategoryThresholds([
        { categories: incompleteRun },
        { categories: passingCategories() },
        { categories: passingCategories() }
      ]),
    /run 1 seo: score unavailable/
  );
});

test("starts Vite preview without a shell", () => {
  const spawnSpec = createPreviewSpawnSpec(43123);

  assert.equal(spawnSpec.command, process.execPath);
  assert.equal(spawnSpec.options.shell, false);
  assert.match(spawnSpec.args[0], /node_modules\/vite\/bin\/vite\.js$/);
  assert.deepEqual(spawnSpec.args.slice(1), [
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "43123",
    "--strictPort"
  ]);
});

test("leaves SIGINT cleanup to the shared signal manager", () => {
  const localOptions = createChromeLaunchOptions({});
  const ciOptions = createChromeLaunchOptions({ CI: "true" });

  assert.equal(localOptions.handleSIGINT, false);
  assert.ok(localOptions.chromeFlags.includes("--disable-dev-shm-usage"));
  assert.ok(!localOptions.chromeFlags.includes("--no-sandbox"));
  assert.ok(ciOptions.chromeFlags.includes("--no-sandbox"));
});

test("waits for every registered cleanup before forwarding a signal", async () => {
  const calls = [];
  const fakeProcess = new EventEmitter();
  fakeProcess.pid = 456;
  fakeProcess.kill = (pid, signal) => {
    calls.push(["forward", pid, signal]);
    return true;
  };

  const manager = createSignalCleanupManager(fakeProcess);
  manager.registerCleanup(async () => {
    calls.push(["preview", "start"]);
    await Promise.resolve();
    calls.push(["preview", "done"]);
  });
  manager.registerCleanup(async () => {
    calls.push(["chrome", "start"]);
    await Promise.resolve();
    calls.push(["chrome", "done"]);
  });

  fakeProcess.emit("SIGTERM");
  await manager.waitForShutdown();

  assert.deepEqual(calls.at(-1), ["forward", 456, "SIGTERM"]);
  assert.equal(calls.filter(([, state]) => state === "done").length, 2);
  manager.dispose();
});

test("withPreviewServer always stops the preview after success", async () => {
  const calls = [];
  const fakeChild = { pid: 123 };

  const result = await withPreviewServer(
    async (url) => {
      calls.push(["run", url]);
      return "complete";
    },
    {
      findPort: async () => 43123,
      startServer: () => {
        calls.push(["start"]);
        return fakeChild;
      },
      waitForReady: async (url) => calls.push(["ready", url]),
      stopServer: async (child) => calls.push(["stop", child])
    }
  );

  assert.equal(result, "complete");
  assert.deepEqual(calls, [
    ["start"],
    ["ready", "http://127.0.0.1:43123/"],
    ["run", "http://127.0.0.1:43123/"],
    ["stop", fakeChild]
  ]);
});

test("withPreviewServer stops the preview when the audit throws", async () => {
  const calls = [];
  const fakeChild = { pid: 123 };

  await assert.rejects(
    withPreviewServer(
      async () => {
        throw new Error("audit failed");
      },
      {
        findPort: async () => 43123,
        startServer: () => fakeChild,
        waitForReady: async () => {},
        stopServer: async (child) => calls.push(["stop", child])
      }
    ),
    /audit failed/
  );
  assert.deepEqual(calls, [["stop", fakeChild]]);
});

test("stopChildProcess terminates a responsive child with SIGTERM", async () => {
  class FakeChild extends EventEmitter {
    exitCode = null;
    signalCode = null;
    signals = [];

    kill(signal) {
      this.signals.push(signal);
      this.signalCode = signal;
      void Promise.resolve().then(() => this.emit("exit", null, signal));
      return true;
    }
  }

  const child = new FakeChild();
  await stopChildProcess(child, 50);
  assert.deepEqual(child.signals, ["SIGTERM"]);
});
