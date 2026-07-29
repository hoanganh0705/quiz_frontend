# Epic 1.2 — User-Store Call-Chain Audit

> **Source ticket**: TKT-1.2.3.1
> **Parent epic**: Epic 1.2 — SDK Regeneration & Barrel Consolidation
> **Generated**: 2026-07-29 against `quiz_frontend/` on branch `main`.

## Current call chain

```
src/features/users/store/user-store.ts:3
  import { getCurrentUser } from '@/features/users/api/users'
       │
       ▼
src/features/users/api/users.ts:8–12
  import {
    getCurrentUser,
    updateMe,
    updateMySettings,
  } from '@/features/users/wrappers/user.wrapper';
       │
       ▼
src/features/users/wrappers/user.wrapper.ts:6
  import { getUsers } from '@/lib/api/generated/users/users';
       │
       ▼
src/lib/api/generated/users/users.ts
  export const getUsers = () => { ... userControllerMe ... }
```

Three hops, two of which are now redundant: `user-store → api/users → wrapper` could collapse to `user-store → wrapper` (or even `user-store → @/lib/api`, since the barrel exposes `getUsers`).

The wrapper already calls the SDK:
```ts
// user.wrapper.ts:18–21
export async function getCurrentUser() {
  const sdk = getUsers();
  return sdk.userControllerMe();
}
```

So the SDK migration itself was already done before Epic 1.2. What remains is **collapsing the deprecated indirection layer** (`users.ts`) so that:

1. `user-store.ts` imports `getCurrentUser` directly from `@/features/users/wrappers/user.wrapper` (one hop instead of two).
2. `users.ts` is either deleted (Path a) or marked `@deprecated` with a redirect (Path a softened).
3. `user.wrapper.ts` is updated to import `getUsers` from `@/lib/api` (the barrel), not from `@/lib/api/generated/users/users` (a deep import that bypasses the barrel and is exactly the pattern Epic 1.2's ESLint rule was added to forbid).

## Callers (audit)

Only **one** file imports from `@/features/users/api/users`:

```
src/features/users/store/user-store.ts:3
  import { getCurrentUser } from '@/features/users/api/users'
```

Only **one** file imports from `@/features/users/wrappers/user.wrapper`:

```
src/features/users/api/users.ts:8
  import { getCurrentUser, updateMe, updateMySettings } from '@/features/users/wrappers/user.wrapper';
```

The wrapper is **not** used directly anywhere else in `src/`. The chain has just two links:
- `user-store.ts → users.ts` (the legacy indirection)
- `users.ts → user.wrapper.ts` (the SDK wrapper)

## Recommendation: **Path (a) collapse**

Three concrete edits in TKT-1.2.3.2:

1. **`src/features/users/store/user-store.ts`**: change the import from `@/features/users/api/users` to `@/features/users/wrappers/user.wrapper`.
2. **`src/features/users/api/users.ts`**: delete the file (or, if reviewer prefers, mark the entire file `@deprecated` and re-export from `@/features/users/wrappers/user.wrapper`).
3. **`src/features/users/wrappers/user.wrapper.ts`**: change the import from `@/lib/api/generated/users/users` to `@/lib/api` (the barrel from TKT-1.2.1.1 + TKT-1.2.1.2).

**Justification:**

- The wrapper is a thin, stable, well-named layer. Importing `getCurrentUser` from `@/features/users/wrappers/user.wrapper` is more discoverable than importing `getUsers().userControllerMe` from `@/lib/api` (the wrapper handles the `getUsers().userControllerMe()` boilerplate).
- The barrel import on `user.wrapper.ts` removes a deep `@/lib/api/generated/...` import that the Epic 1.2 ESLint rule was added to forbid.
- The `users.ts` file is marked `@deprecated` and exists only as a re-export. Removing it eliminates the only remaining caller of the deep `@/features/users/wrappers/user.wrapper` path.

**Path (b) (no-op) is rejected.** Even if `users.ts` is kept, `user.wrapper.ts`'s deep `@/lib/api/generated/...` import still violates the ESLint rule from TKT-1.2.1.4 (which currently exempts `src/lib/api/**` only). The file would need to be moved into the exempt glob or its imports updated either way.

## Deprecation plan

- **`users.ts`** will be **deleted** in TKT-1.2.3.2. Rationale: the file has a single caller (`user-store.ts`), is already marked `@deprecated`, and deletion is preferred over a `redirect-style` re-export because it forces the caller to import from the canonical path (`user.wrapper.ts`).
- **`user.wrapper.ts`** stays. Its public API (`getCurrentUser`, `updateMe`, `updateMySettings`) is preserved bit-for-bit. Only its internal import paths change.

## Files modified

- `quiz_frontend/docs/user-store-inventory.md` (new, this file).
- No source files modified in this ticket (TKT-1.2.3.1 is observational).

---

## TKT-1.2.3.3 verification — final state

Recorded at the end of B-1.2.D against `quiz_frontend/` on branch `main`.

- `pnpm type-check` exit code: **1** (4 pre-existing TS errors in `src/features/quizzes/components/QuizPlayer/QuizDetail.tsx`; **0 errors** in `src/features/auth/**`, `src/features/users/**`, or `src/lib/api/**`).
- `pnpm test` exit code: **1** (2 pre-existing test-suite failures in `tests/unit/formatDuration.test.ts` and `tests/unit/quizResultsUtils.test.ts` — kebab-case vs camelCase path mismatch in `vitest.config.ts` alias; **0 test failures** attributable to Epic 1.2).
- Wall-clock: type-check ~1.8 s, tests ~0.9 s.

The user-store migration is type-safe and produces no new errors.