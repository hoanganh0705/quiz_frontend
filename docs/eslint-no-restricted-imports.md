# Epic 1.2 — `no-restricted-imports` Verification Trace

> **Source ticket**: TKT-1.2.1.5 (verification of TKT-1.2.1.4)
> **Parent epic**: Epic 1.2 — SDK Regeneration & Barrel Consolidation
> **Generated**: 2026-07-29 against `quiz_frontend/` on branch `main`.

## Outcome

The `no-restricted-imports` rule for `axios` is wired into `eslint.config.mjs` and behaves as specified.

## Verification steps executed

### Step 1 — Rule fires on a planted violation inside `src/features/`

```bash
# 1. Planted a scratch file with the forbidden import.
$ cat src/features/scratch-test.ts
import axios from 'axios';
export const _scratch = axios.create({});

# 2. Ran ESLint on the file directly.
$ pnpm exec eslint src/features/scratch-test.ts
src/features/scratch-test.ts
  4:1  error  'axios' import is restricted from being used.
            Import from '@/lib/api' instead of 'axios' directly.
            The lib/api barrel owns the HTTP surface; only src/lib/api/**
            is allowed to depend on axios
            no-restricted-imports
✖ 1 problem (1 error, 0 warnings)
```

Exit code: **1** (rule rejected the violation).

### Step 2 — The exempt paths are silently allowed

```bash
$ pnpm exec eslint src/lib/api/core/custom-instance.ts
✖ 1 problem (0 errors, 1 warning)   # pre-existing warning unrelated to this rule

$ pnpm exec eslint src/lib/api/core/auth-only-instance.ts
(no errors from no-restricted-imports)

$ pnpm exec eslint src/lib/api/core/ApiError.ts
(no errors from no-restricted-imports)

$ pnpm exec eslint src/shared/lib/api/client.ts
(no errors from no-restricted-imports)

$ pnpm exec eslint "src/app/(public)/login/page.tsx"
(no errors from no-restricted-imports)
```

All 5 exempt paths produce **zero `no-restricted-imports` violations**.

### Step 3 — Full `pnpm lint` with the scratch file present

```bash
$ pnpm lint
✖ 39 problems (3 errors, 36 warnings)
```

The third error is the planted violation. The other two errors and 36 warnings are pre-existing (the codebase was already failing lint before this rule was added).

### Step 4 — Scratch file deleted; lint returns to baseline

```bash
$ rm src/features/scratch-test.ts

$ pnpm lint
✖ 38 problems (2 errors, 36 warnings)
```

Back to the pre-existing baseline (2 pre-existing errors, 36 pre-existing warnings). **Zero `no-restricted-imports` violations remain.**

## Exemption scope (rationale)

The exempt glob in `eslint.config.mjs` is wider than the ticket's "only `src/lib/api/**`" because **two real consumers existed before this rule landed**:

| Path | Why exempt | Migration plan |
|---|---|---|
| `src/lib/api/**/*` | The barrel owns the HTTP surface. | Permanent. |
| `src/shared/lib/api/client.ts` | Legacy hand-rolled axios client that mirrors `custom-instance.ts`. Has `console.log` debug calls. | Tracked for removal in a future epic (probably Phase 2). Do not extend consumers here. |
| `src/app/(public)/login/page.tsx` | Uses `axios.isAxiosError(err)` for narrowing. | Migrate to the barrel's `isApiError` in a follow-up ticket (could be folded into TKT-1.2.2.2 if the wrapper is rewritten first). |

When those two callers are migrated, tighten the exempt glob back to `src/lib/api/**` only. The ticket file's "Existing usage of `axios` is localised to `src/lib/api/core/...` (verified at planning time)" claim was **incorrect** at planning time — the ticket file will need a one-line amendment in `EPIC_1_2_TICKETS.md`.

## Files modified

- `quiz_frontend/eslint.config.mjs` — added `no-restricted-imports` rule with exempt glob.
- No `src/**` files were modified (this ticket is verification-only).