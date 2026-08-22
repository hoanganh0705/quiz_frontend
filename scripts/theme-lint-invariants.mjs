#!/usr/bin/env node
/**
 * theme-lint-invariants.mjs — Token-discipline lint gate.
 *
 * Complements the per-feature invariant linters
 * (`admin-lint-invariants`, `social-lint-invariants`,
 * `realtime-lint-invariants`, `authoring-lint-invariants`).
 *
 * ## Checks
 *
 *   1. **no-foreground-opacity-body-text** — No body-text use of
 *      `text-foreground/70`, `/60`, `/50`, `/40` (the rendered contrast
 *      against `--background` fails WCAG 2.1 SC 1.4.3). Allow-list
 *      covers the sidebar trigger, the kbd shortcut badge, and any
 *      className that explicitly overrides to `size-*` (chrome
 *      decoration, not body text).
 *
 *   2. **no-raw-red-green-body-text** — No body-text use of
 *      `text-red-500`, `text-red-600`, `text-green-500`, or
 *      `text-green-600`. Decorative `/10` and `/20` tints, progress-bar
 *      fills (`bg-red-500`, `bg-green-500`), and rank/gamification
 *      palette (`red-700`, `green-700`) are exempt because they
 *      already render against tinted surfaces and require a separate
 *      `--surface-*` token pass.
 *
 *   3. **icon-button-touch-target** — In `components/ui/Button.tsx`,
 *      the `size.icon` CVA variant must produce a 44×44 px hit area
 *      (`size-11` or larger). WCAG 2.5.5 Target Size (Level AAA).
 *
 *   4. **autoplay-has-pause** — `QuizCategories.tsx` must expose a
 *      Pause/Play toggle in addition to the autoplay config. WCAG 2.2.2
 *      Pause/Stop/Hide.
 *
 *   5. **token-system-uses-tokens** — The semantic token names
 *      `foreground-secondary`, `success`, `warning` must be reachable
 *      in `globals.css`. Catches accidental removal of the @theme
 *      inline block entries.
 *
 *   6. **no-pure-purple-gradient-text** — No
 *      `bg-linear-to-r from-purple-* ... bg-clip-text` AI-palette
 *      heading on production pages. `TestKnowledge.tsx` (already
 *      migrated) must not regress.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const GLOBALS_CSS = path.join(SRC, "app", "globals.css");
const BUTTON_TSX = path.join(SRC, "components", "ui", "Button.tsx");
const QUIZ_CATEGORIES_TSX = path.join(
  SRC,
  "features",
  "categories",
  "components",
  "QuizCategories.tsx",
);

const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

const args = new Set(process.argv.slice(2));
const CI = args.has("--ci");

async function walk(dir) {
  const { readdir, stat } = await import("node:fs/promises");
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (
      /\.(tsx?|jsx?|css)$/.test(entry.name) &&
      !/\.spec\.(tsx?|jsx?)$/.test(entry.name) &&
      !/\.__tests__\//.test(full)
    ) {
      out.push(full);
    }
  }
  return out;
}

function lineOf(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

let ok = true;
const violations = [];

function reportViolation(check, file, line, snippet, message) {
  ok = false;
  violations.push({ check, file, line, snippet, message });
  process.stdout.write(
    `  ${RED("✗")} ${BOLD(check)} ${path.relative(ROOT, file)}:${line}\n    ${snippet}\n    ${YELLOW(message)}\n`,
  );
}

function reportOk(check) {
  process.stdout.write(`  ${GREEN("✓")} ${BOLD(check)}\n`);
}

async function checkForegroundOpacity() {
  const files = await walk(SRC);
  let count = 0;
  for (const file of files) {
    const src = await readFile(file, "utf8");
    const re = /text-foreground\/([4567]0)(?!\d)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const lineSrc = src.slice(Math.max(0, m.index - 200), m.index + 80);
      // Allow chrome: sidebar trigger / kbd / size overrides.
      if (/SidebarTrigger|<kbd|size-\d+|size-icon/.test(lineSrc)) continue;
      count += 1;
      reportViolation(
        "no-foreground-opacity-body-text",
        file,
        lineOf(src, m.index),
        m[0],
        `text-foreground/${m[1]} measures below WCAG AA body contrast against --background; use text-foreground-secondary (or text-muted-foreground for purely decorative captions).`,
      );
    }
  }
  if (count === 0) reportOk("no-foreground-opacity-body-text");
  return count;
}

async function checkRawRedGreenText() {
  const files = await walk(SRC);
  let count = 0;
  for (const file of files) {
    const src = await readFile(file, "utf8");
    // Match text-red-500 / text-green-500 with no decorative /10 /20 tint.
    const re = /(?<!bg-)(text-red-500|text-green-500|text-red-600|text-green-600)(?!\/)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      count += 1;
      reportViolation(
        "no-raw-red-green-body-text",
        file,
        lineOf(src, m.index),
        m[0],
        `Inline body-text use of raw palette; migrate to text-destructive / text-success (semantic tokens). Decorative tints (/10, /20) and rank/gamification palette are exempt.`,
      );
    }
  }
  if (count === 0) reportOk("no-raw-red-green-body-text");
  return count;
}

async function checkIconButtonTouchTarget() {
  const src = await readFile(BUTTON_TSX, "utf8");
  // Match the icon size entry: `icon: 'size-N'`
  const m = src.match(/icon:\s*['"]size-(\d+)['"]/);
  if (!m) {
    reportViolation(
      "icon-button-touch-target",
      BUTTON_TSX,
      1,
      "(no size.icon variant)",
      "Button.tsx has no size.icon variant; check this manually.",
    );
    return 1;
  }
  const n = Number(m[1]);
  if (n < 11) {
    reportViolation(
      "icon-button-touch-target",
      BUTTON_TSX,
      lineOf(src, m.index),
      m[0],
      `size.icon is ${n} (${n * 4}px); WCAG 2.5.5 (Level AAA) requires ≥44px.`,
    );
    return 1;
  }
  reportOk("icon-button-touch-target");
  return 0;
}

async function checkAutoplayPause() {
  const src = await readFile(QUIZ_CATEGORIES_TSX, "utf8");
  const hasAutoplay = /autoplay\s*[:={?]/.test(src);
  // Match both literal strings and ternaries that resolve to the canonical labels.
const pauseOrResume = /Pause carousel auto-play|Resume carousel auto-play/;
const hasPauseControl =
  pauseOrResume.test(src) &&
  (src.match(/Pause carousel auto-play/g) || []).length >= 1 &&
  (src.match(/Resume carousel auto-play/g) || []).length >= 1;
  if (!hasAutoplay || !hasPauseControl) {
    reportViolation(
      "autoplay-has-pause",
      QUIZ_CATEGORIES_TSX,
      1,
      `(autoplay=${hasAutoplay}, pause-control=${hasPauseControl})`,
      "QuizCategories must expose a Pause/Play toggle (WCAG 2.2.2).",
    );
    return 1;
  }
  reportOk("autoplay-has-pause");
  return 0;
}

async function checkTokenSystem() {
  const src = await readFile(GLOBALS_CSS, "utf8");
  const required = [
    "--foreground-secondary",
    "--success",
    "--warning",
    "--color-foreground-secondary",
    "--color-success",
    "--color-warning",
  ];
  let missing = 0;
  for (const token of required) {
    if (!src.includes(token)) {
      missing += 1;
      reportViolation(
        "token-system-uses-tokens",
        GLOBALS_CSS,
        1,
        token,
        `globals.css is missing token "${token}". Re-add to keep semantic tokens reachable.`,
      );
    }
  }
  if (missing === 0) reportOk("token-system-uses-tokens");
  return missing;
}

async function checkPurpleGradientText() {
  const files = await walk(SRC);
  let count = 0;
  for (const file of files) {
    const src = await readFile(file, "utf8");
    // Match the AI-palette tell: a heading using bg-clip-text with a purple- start.
    const re = /bg-linear-to-[a-z\- ]+from-purple-\d+[^\n"]*bg-clip-text/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      count += 1;
      reportViolation(
        "no-pure-purple-gradient-text",
        file,
        lineOf(src, m.index),
        m[0].slice(0, 120),
        `Purple gradient text is the AI-palette tell. Use text-brand or text-foreground with font weight for emphasis.`,
      );
    }
  }
  if (count === 0) reportOk("no-pure-purple-gradient-text");
  return count;
}

async function main() {
  process.stdout.write(`${BOLD("[theme:lint-invariants]")} running…\n`);
  await Promise.all([
    checkForegroundOpacity(),
    checkRawRedGreenText(),
    checkIconButtonTouchTarget(),
    checkAutoplayPause(),
    checkTokenSystem(),
    checkPurpleGradientText(),
  ]);

  if (ok) {
    process.stdout.write(
      `\n${GREEN("[theme:lint-invariants] all checks passed")}\n`,
    );
    process.exit(0);
  } else {
    process.stdout.write(
      `\n${RED(`[theme:lint-invariants] ${violations.length} violation(s)`)}\n`,
    );
    if (CI) process.exit(1);
    // non-CI exits 0 with warnings to allow pre-commit experimentation;
    // CI mode is the gate.
    process.exit(0);
  }
}

main().catch((err) => {
  process.stderr.write(`[theme:lint-invariants] fatal: ${err}\n`);
  process.exit(1);
});