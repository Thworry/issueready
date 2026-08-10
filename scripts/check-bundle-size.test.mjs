import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";

import { enforceBudget, gzipJavaScriptBytes } from "./check-bundle-size.mjs";

test("gzipJavaScriptBytes sums JavaScript assets and excludes other files", async (t) => {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "issueready-bundle-")
  );
  const assetsDirectory = path.join(temporaryDirectory, "assets");
  await mkdir(assetsDirectory);
  t.after(() => rm(temporaryDirectory, { recursive: true, force: true }));

  const firstJavaScript = "console.log('first asset');";
  const secondJavaScript = "export const second = 'asset';";
  await Promise.all([
    writeFile(path.join(assetsDirectory, "first.js"), firstJavaScript),
    writeFile(path.join(assetsDirectory, "second.js"), secondJavaScript),
    writeFile(path.join(assetsDirectory, "styles.css"), "body { color: red; }")
  ]);

  const expectedBytes =
    gzipSync(firstJavaScript).byteLength +
    gzipSync(secondJavaScript).byteLength;

  assert.equal(await gzipJavaScriptBytes(assetsDirectory), expectedBytes);
});

test("enforceBudget accepts the 204800-byte limit", () => {
  assert.doesNotThrow(() => enforceBudget(204800, 204800));
});

test("enforceBudget throws above the 204800-byte limit", () => {
  assert.throws(
    () => enforceBudget(204801, 204800),
    /204801 compressed JavaScript bytes exceeds the 204800-byte budget/
  );
});
