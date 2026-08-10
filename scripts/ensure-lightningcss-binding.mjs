#!/usr/bin/env node
// Workaround: Tailwind CSS v4 (used via @tailwindcss/postcss) bundles `lightningcss`
// as an optional transitive dependency. pnpm does not hoist optional dependencies,
// so `lightningcss` and its native binary `lightningcss-linux-x64-gnu` are not
// resolvable from `node_modules/` directly. Next.js' Turbopack uses a static
// analyzer that cannot follow the dynamic `require(\`lightningcss-${parts.join('-')}\`)`
// pattern in `lightningcss/node/index.js` and the runtime fails with
// `Cannot find module 'unknown'`. To work around this, we manually hoist the
// platform-specific native binary and its transitive `detect-libc` dependency
// to the top-level `node_modules/`.
//
// This script is idempotent and safe to re-run.

import { existsSync, mkdirSync, readdirSync, readlinkSync, symlinkSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const projectRoot = process.cwd();
const pnpmDir = join(projectRoot, "node_modules", ".pnpm");

if (!existsSync(pnpmDir)) {
  // Nothing to do; pnpm has not installed yet.
  process.exit(0);
}

function pickPnpmDir(matcher) {
  let entries = [];
  try {
    entries = readdirSync(pnpmDir);
  } catch {
    return undefined;
  }
  return entries.filter(matcher).sort()[0];
}

function ensureSymlink(targetRel, linkRel) {
  const link = join(projectRoot, "node_modules", linkRel);
  const target = join(pnpmDir, targetRel);
  if (!existsSync(target)) return false;
  try {
    if (existsSync(link)) {
      let cur;
      try {
        cur = readlinkSync(link);
      } catch {
        // not a symlink; leave alone
        return true;
      }
      if (cur === join("node_modules", ".pnpm", targetRel)) return true;
      unlinkSync(link);
    } else {
      mkdirSync(join(projectRoot, "node_modules"), { recursive: true });
    }
    symlinkSync(join(".pnpm", targetRel), link);
    return true;
  } catch (err) {
    console.warn(`[postinstall] failed to create symlink ${link}:`, err.message);
    return false;
  }
}

// 1. Hoist `lightningcss` at the version that @tailwindcss/postcss pins to (1.30.2).
const lightningcssDir = pickPnpmDir((n) => /^lightningcss@1\.30\.2$/.test(n));
if (lightningcssDir) {
  ensureSymlink(`${lightningcssDir}/node_modules/lightningcss`, "lightningcss");
}

// 2. Detect host platform/arch and hoist the matching native binary.
const platform = process.platform;
const arch = process.arch;
let libcSuffix = "";
if (platform === "linux") {
  // Try gnu first, then musl.
  for (const candidate of ["gnu", "musl"]) {
    const pkg = `lightningcss-${platform}-${arch}-${candidate}`;
    const pnpmEntry = pickPnpmDir((n) => n === `${pkg}@1.30.2`);
    if (pnpmEntry) {
      ensureSymlink(`${pnpmEntry}/node_modules/${pkg}`, pkg);
      libcSuffix = candidate;
      break;
    }
  }
} else if (platform === "darwin") {
  // Apple Silicon first, then Intel.
  const candidates = arch === "arm64" ? ["darwin-arm64", "darwin-x64"] : ["darwin-x64"];
  for (const suffix of candidates) {
    const pkg = `lightningcss-${suffix}`;
    const pnpmEntry = pickPnpmDir((n) => n === `${pkg}@1.30.2`);
    if (pnpmEntry) {
      ensureSymlink(`${pnpmEntry}/node_modules/${pkg}`, pkg);
      libcSuffix = suffix;
      break;
    }
  }
} else if (platform === "win32") {
  const archSuffix = arch === "arm64" ? "win32-arm64-msvc" : "win32-x64-msvc";
  const pkg = `lightningcss-${archSuffix}`;
  const pnpmEntry = pickPnpmDir((n) => n === `${pkg}@1.30.2`);
  if (pnpmEntry) {
    ensureSymlink(`${pnpmEntry}/node_modules/${pkg}`, pkg);
    libcSuffix = archSuffix;
  }
}

// 3. Hoist `detect-libc` so `lightningcss/index.js` can `require()` it.
const detectLibcDir = pickPnpmDir((n) => /^detect-libc@/.test(n));
if (detectLibcDir) {
  ensureSymlink(`${detectLibcDir}/node_modules/detect-libc`, "detect-libc");
}

if (lightningcssDir) {
  console.log(
    `[postinstall] lightningcss native binding ensured for ${platform}-${arch}${libcSuffix ? "-" + libcSuffix : ""}`
  );
}
