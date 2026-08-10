import console from "node:console";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

export const JAVASCRIPT_BUDGET_BYTES = 204800;

export async function gzipJavaScriptBytes(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  let totalBytes = 0;

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      totalBytes += await gzipJavaScriptBytes(entryPath);
    } else if (entry.isFile() && path.extname(entry.name) === ".js") {
      totalBytes += gzipSync(await readFile(entryPath)).byteLength;
    }
  }

  return totalBytes;
}

export function enforceBudget(bytes, limit) {
  if (bytes > limit) {
    throw new Error(
      `${bytes} compressed JavaScript bytes exceeds the ${limit}-byte budget`
    );
  }
}

async function main() {
  const assetsDirectory = path.resolve("dist/assets");
  const measuredBytes = await gzipJavaScriptBytes(assetsDirectory);
  console.log(
    `Compressed JavaScript: ${measuredBytes} / ${JAVASCRIPT_BUDGET_BYTES} bytes`
  );
  enforceBudget(measuredBytes, JAVASCRIPT_BUDGET_BYTES);
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
