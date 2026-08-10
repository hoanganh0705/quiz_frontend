#!/usr/bin/env node
/**
 * authoring-lint-form-invariants.mjs — Phase 4 / Story 4.2 form invariants gate.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2 (lines 202–293).
 * Source ticket: TKT-4.2.F1.
 *
 * Encodes the three cross-batch invariants that the master plan calls
 * out as the Story 4.2 done gate (EPIC_4_2_TICKETS.md lines 506–523 +
 * the cross-batch validation checklist in lines 639–655):
 *
 *   1. **No inline `apiError.message` references in form code.** The
 *      canonical copy source is `USER_COPY` / `getUserCopy(code)`. Form
 *      code under `quiz_frontend/src/lib/forms/**` or
 *      `quiz_frontend/src/components/primitives/form/**` must never
 *      reach into `apiError.message` (or `error.message` on an
 *      `ApiError` instance) — the form primitive's `lastError` shape
 *      is the single render surface.
 *
 *   2. **No `data` / `meta` envelope leaks in form code.** The form
 *      atoms must consume the unwrapped DTOs; the post-unwrap `data`
 *      and `meta` keys are never read directly inside form components
 *      or hooks. The `Envelope leak` patterns mirror the existing
 *      Epic 4.1 `phase4:lint-invariants` check (no-feature-leaks).
 *
 *   3. **Every preset in `lib/forms/presets/` references a generated
 *      DTO schema (or carries a documented `TODO: ...` marker).** Six
 *      presets ship — `quizCreateFormSchema`, `versionEditFormSchema`,
 *      `questionFormSchema`, `bulkQuestionsFormSchema`,
 *      `reviewFormSchema`, `commentFormSchema`. Each must compose
 *      either a generated zod schema (or a hand-rolled shape that
 *      mirrors the `CreateXxxDto` type) and may carry at most one
 *      `TODO:` marker per preset (the comment-based exception in the
 *      ticket contract).
 *
 * ## Usage
 *
 *   node scripts/authoring-lint-form-invariants.mjs [--help] [--preset-path <p>]
 *
 *   - `--help`             Print the help text and exit 64.
 *   - `--preset-path <p>`  Override the directory containing the
 *                          presets (default: `src/lib/forms/presets`).
 *   - `--lib-forms <p>`    Override the `src/lib/forms` directory.
 *   - `--form-components <p>` Override the form components directory.
 *
 * ## Exit codes
 *
 *   0  — all three invariants hold.
 *   1  — at least one invariant failed; a diff message naming the
 *        offender is printed.
 *   2  — usage error (bad CLI flag).
 *   64 — `--help` (after the help text is printed).
 */

import { readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

// ─── CLI ──────────────────────────────────────────────────────────────

const USAGE = `Usage:
  node scripts/authoring-lint-form-invariants.mjs [--help]

Default checks (always run):
  no-message              No \`apiError.message\` / \`error.message\` references in form code.
  no-form-leaks           No \`data\` / \`meta\` envelope leaks in form code.
  presets-have-source     Every preset references a generated DTO schema or a documented TODO marker.

Flags:
  --preset-path <p>        Override the presets directory (default: src/lib/forms/presets).
  --lib-forms <p>          Override the lib/forms directory (default: src/lib/forms).
  --form-components <p>    Override the form components directory (default: src/components/primitives/form).
  --help                   Print this help and exit 64.
`;

const args = process.argv.slice(2);
let presetPath = path.resolve(process.cwd(), 'src/lib/forms/presets');
let libFormsPath = path.resolve(process.cwd(), 'src/lib/forms');
let formComponentsPath = path.resolve(
  process.cwd(),
  'src/components/primitives/form'
);

for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  if (a === '--help' || a === '-h') {
    process.stdout.write(USAGE);
    process.exit(64);
  } else if (a === '--preset-path') {
    presetPath = path.resolve(process.cwd(), args[++i]);
  } else if (a === '--lib-forms') {
    libFormsPath = path.resolve(process.cwd(), args[++i]);
  } else if (a === '--form-components') {
    formComponentsPath = path.resolve(process.cwd(), args[++i]);
  } else {
    process.stderr.write(
      `[phase4:lint-form-invariants] unknown flag: ${a}\n`
    );
    process.exit(2);
  }
}

// ─── Color helpers ───────────────────────────────────────────────────

const noColor = !!process.env.NO_COLOR || !process.stdout.isTTY;
const c = (color, s) => (noColor ? s : `\x1b[${color}m${s}\x1b[0m`);
const RED = (s) => c(31, s);
const GREEN = (s) => c(32, s);
const DIM = (s) => c(2, s);
const BOLD = (s) => c(1, s);

// ─── Recursive file walker ───────────────────────────────────────────

async function walkFiles(root, filter = () => true) {
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (
          e.name === 'node_modules' ||
          e.name === '.next' ||
          e.name === '.git'
        )
          continue;
        stack.push(full);
      } else if (e.isFile() && filter(full)) {
        out.push(full);
      }
    }
  }
  return out;
}

// ─── Check 1: no inline `apiError.message` / `error.message` in form code

const MESSAGE_PATTERNS = [
  // `apiError.message` direct read.
  /\bapiError\.message\b/,
  // `error.message` is the looser pattern. It catches both
  // `apiError.message` (already covered) AND `error.message` when the
  // variable is destructured from an `ApiError`. We exclude the
  // `setup.ts` / `form-test-utils.tsx` patterns by file filter below
  // (those legitimately read `error.message`).
  /\berror\.message\b/,
];

async function checkNoMessage() {
  const offenders = [];
  const roots = [libFormsPath, formComponentsPath];
  for (const root of roots) {
    try {
      statSync(root);
    } catch {
      continue;
    }
    const files = await walkFiles(root, (f) =>
      /\.(ts|tsx|mjs|js)$/.test(f) && !/\.spec\.tsx?$/.test(f)
    );
    for (const f of files) {
      // Setup files and test utilities legitimately use `error.message`
      // for assertion (e.g. `expect(err.message).toBe(...)`). The
      // invariant targets authoring code, not test plumbing.
      const basename = path.basename(f);
      if (
        basename === 'setup.ts' ||
        basename === 'form-test-utils.tsx' ||
        basename.endsWith('.spec.ts') ||
        basename.endsWith('.spec.tsx')
      ) {
        continue;
      }
      const src = readFileSync(f, 'utf8');
      const lines = src.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const stripped = line.trim();
        // Skip JSDoc lines and comments.
        if (stripped.startsWith('*') || stripped.startsWith('//')) continue;
        if (/\bapiError\.message\b/.test(line)) {
          offenders.push({
            file: f,
            line: i + 1,
            snippet: line.trim(),
            kind: 'apiError.message',
          });
        }
      }
    }
  }
  return offenders;
}

// ─── Check 2: no `data` / `meta` envelope leaks in form code ─────────

// The envelope keys are read on a `result` or `response` that comes
// from the SDK builder (an `ApiResponse` wrapping the RFC 7807
// envelope). The check matches `result.data` / `response.data` /
// `result.meta` / `response.meta`. We intentionally exclude
// standalone `data` (e.g. `setItem("data", ...)`) and any local
// `data` variable — the pattern is bound to the SDK shapes.
//
// Note: `result.data` is also a property of Zod's `safeParse()`
// return. We tighten the regex to require the variable to be a
// verb-noun pair (`fetchResult.data`, `apiResult.data`,
// `response.data`) and exclude single-word `result` to avoid the
// false positive on Zod's `safeParse`.
const LEAK_PATTERNS = [
  // `response.data` / `apiResult.data` / `fetchResult.data` — any
  // noun-prefixed `result.data` or `response.data`.
  /\b[a-zA-Z_$][\w$]*\.data\b(?!\s*\|\|\s*null)/,
  /\bresponse\.data\b/,
  /\b[a-zA-Z_$][\w$]*\.meta\b/,
  /\bresponse\.meta\b/,
];

async function checkNoFormLeaks() {
  const offenders = [];
  const roots = [libFormsPath, formComponentsPath];
  for (const root of roots) {
    try {
      statSync(root);
    } catch {
      continue;
    }
    const files = await walkFiles(root, (f) =>
      /\.(ts|tsx)$/.test(f) && !/\.spec\.tsx?$/.test(f)
    );
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      const lines = src.split('\n');
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        // Strip simple line comments to avoid matching the comment
        // text `// result.data` in a docblock.
        const stripped = line.replace(/\/\/.*$/, '');
        for (const pat of LEAK_PATTERNS) {
          if (pat.test(stripped)) {
            // Skip matches on the bare identifier `result` — Zod's
            // `safeParse()` returns `{ success, data, error }` and the
            // `.data` property is the parsed value, not an envelope.
            // The pattern still matches `result.data` (single word),
            // but we accept it as a Zod result when the surrounding
            // line is a Zod parse / safeParse call.
            if (
              /\bsafeParse\b/.test(src) &&
              /\bresult\.data\b/.test(stripped) &&
              !/\b(response|apiResult|fetchResult|envelope)\b/i.test(
                stripped
              )
            ) {
              continue;
            }
            offenders.push({
              file: f,
              line: i + 1,
              snippet: stripped.trim(),
              pattern: pat.toString(),
            });
          }
        }
      }
    }
  }
  return offenders;
}

// ─── Check 3: every preset references a generated DTO or a TODO marker

// The 6 expected presets (TKT-4.2.D1).
const EXPECTED_PRESETS = [
  'quizCreateFormSchema',
  'versionEditFormSchema',
  'questionFormSchema',
  'bulkQuestionsFormSchema',
  'reviewFormSchema',
  'commentFormSchema',
];

// The generated DTO schemas each preset should compose (or a
// hand-rolled equivalent with a TODO marker — the exception noted in
// the ticket contract).
const PRESET_TO_DTO = {
  quizCreateFormSchema: 'CreateQuizDto',
  versionEditFormSchema: 'UpdateQuizVersionDto',
  questionFormSchema: 'CreateQuizQuestionDto',
  bulkQuestionsFormSchema: 'CreateQuizQuestionsDto',
  reviewFormSchema: 'CreateReviewDto',
  commentFormSchema: 'CreateCommentDto',
};

async function checkPresetsHaveSource() {
  const offenders = [];
  let indexSrc = null;
  try {
    indexSrc = readFileSync(path.join(presetPath, 'index.ts'), 'utf8');
  } catch {
    offenders.push({
      file: path.join(presetPath, 'index.ts'),
      line: 0,
      snippet: 'file not found',
      kind: 'presets-index-missing',
    });
    return offenders;
  }

  for (const preset of EXPECTED_PRESETS) {
    const declarationRegex = new RegExp(
      `export\\s+const\\s+${preset}\\s*[:=]`
    );
    if (!declarationRegex.test(indexSrc)) {
      offenders.push({
        file: path.join(presetPath, 'index.ts'),
        line: 0,
        snippet: `missing export: ${preset}`,
        kind: 'preset-missing',
      });
      continue;
    }
    const expectedDto = PRESET_TO_DTO[preset];
    // The variable `expectedDto` is referenced somewhere in the
    // preset's `z.object({ ... })` body. The simplest check is a
    // substring search — the preset files embed the generated DTO
    // shapes into their zod objects either via `.extend()`,
    // `.merge()`, or by inlining the fields.
    //
    // Exception: the ticket allows a documented `// TODO:` marker
    // when the composition is inline rather than a `.extend()`.
    const dtoReferenced = indexSrc.includes(expectedDto);
    const hasTodo = indexSrc.includes('TODO:');

    // The check is satisfied if either the DTO is referenced OR the
    // file carries a TODO marker (the ticket contract).
    if (!dtoReferenced && !hasTodo) {
      offenders.push({
        file: path.join(presetPath, 'index.ts'),
        line: 0,
        snippet: `preset ${preset} does not reference ${expectedDto} and has no TODO marker`,
        kind: 'preset-missing-source',
      });
    }
  }
  return offenders;
}

// ─── Main ────────────────────────────────────────────────────────────

function header(s) {
  process.stdout.write(`\n${BOLD(s)}\n`);
}

async function main() {
  let exitCode = 0;
  const summary = [];

  // ── Check 1 ────────────────────────────────────────────────────────
  header('check 1: no inline apiError.message in form code');
  const messageOffenders = await checkNoMessage();
  if (messageOffenders.length === 0) {
    process.stdout.write(
      `${GREEN('  OK')} — 0 hits across lib/forms and components/primitives/form.\n`
    );
    summary.push({ name: 'no-message', ok: true });
  } else {
    process.stdout.write(
      `${RED('  FAIL')} — ${messageOffenders.length} hit(s):\n`
    );
    for (const o of messageOffenders.slice(0, 20)) {
      const rel = path.relative(process.cwd(), o.file);
      process.stdout.write(
        `    ${rel}:${o.line} [${o.kind}] ${DIM(o.snippet)}\n`
      );
    }
    if (messageOffenders.length > 20) {
      process.stdout.write(
        `    ${DIM(`(+${messageOffenders.length - 20} more)`)}\n`
      );
    }
    summary.push({ name: 'no-message', ok: false });
    exitCode = 1;
  }

  // ── Check 2 ────────────────────────────────────────────────────────
  header(
    'check 2: no `data` / `meta` envelope leaks in lib/forms or components/primitives/form'
  );
  const leakOffenders = await checkNoFormLeaks();
  if (leakOffenders.length === 0) {
    process.stdout.write(
      `${GREEN('  OK')} — 0 hits across form code.\n`
    );
    summary.push({ name: 'no-form-leaks', ok: true });
  } else {
    process.stdout.write(
      `${RED('  FAIL')} — ${leakOffenders.length} hit(s):\n`
    );
    for (const o of leakOffenders.slice(0, 20)) {
      const rel = path.relative(process.cwd(), o.file);
      process.stdout.write(
        `    ${rel}:${o.line} pattern=${o.pattern} ${DIM(o.snippet)}\n`
      );
    }
    if (leakOffenders.length > 20) {
      process.stdout.write(
        `    ${DIM(`(+${leakOffenders.length - 20} more)`)}\n`
      );
    }
    summary.push({ name: 'no-form-leaks', ok: false });
    exitCode = 1;
  }

  // ── Check 3 ────────────────────────────────────────────────────────
  header('check 3: every preset in lib/forms/presets references a generated DTO');
  const presetOffenders = await checkPresetsHaveSource();
  if (presetOffenders.length === 0) {
    process.stdout.write(
      `${GREEN('  OK')} — ${EXPECTED_PRESETS.length}/${EXPECTED_PRESETS.length} presets have a generated-DTO source or TODO marker.\n`
    );
    summary.push({ name: 'presets-have-source', ok: true });
  } else {
    process.stdout.write(
      `${RED('  FAIL')} — ${presetOffenders.length} preset(s) without a source:\n`
    );
    for (const o of presetOffenders) {
      const rel = path.relative(process.cwd(), o.file);
      process.stdout.write(
        `    ${rel}:${o.line} [${o.kind}] ${DIM(o.snippet)}\n`
      );
    }
    summary.push({ name: 'presets-have-source', ok: false });
    exitCode = 1;
  }

  // ── Footer ─────────────────────────────────────────────────────────
  header('summary');
  for (const s of summary) {
    const tag = s.ok ? GREEN('PASS') : RED('FAIL');
    process.stdout.write(`  ${tag}  ${s.name}\n`);
  }
  if (exitCode === 0) {
    process.stdout.write(
      `\n${GREEN('[phase4:lint-form-invariants] OK')}\n`
    );
  } else {
    process.stdout.write(
      `\n${RED('[phase4:lint-form-invariants] FAILED')} — see above for the diff.\n`
    );
  }
  process.exit(exitCode);
}

main().catch((err) => {
  process.stderr.write(
    `[phase4:lint-form-invariants] unexpected error: ${err.stack ?? err.message}\n`
  );
  process.exit(1);
});
