# Plan — Wire up "Start attempt" on the quiz detail page

**Status:** Draft — pending user approval.
**Goal:** Make `Start attempt` actually start a backend-backed attempt when a logged-in user clicks it on `/quizzes/[idOrSlug]`.

---

## 1. Investigation summary — why "Start attempt" doesn't work today

The frontend scaffolding for the full attempt lifecycle is already in place — backend SDK functions, service wrappers, hooks, store, runner components, runner page, and integration tests all exist. The piece that's *not* wired up is a single feature-flag gate:

**File:** `quiz_frontend/src/features/quizzes/components/QuizCtaStrip.tsx:72`

```ts
const isPhase4Live = isFeatureEnabled('attempts_live', 'live')
// ...
if (!isPhase4Live) {
  return <PlaceholderStrip quizId={quizId} className={className} />
}
```

`attempts_live` defaults to `'placeholder'` (`quiz_frontend/src/lib/feature-flags/feature-flags.ts:815`). In placeholder mode, the strip renders a **disabled** Start button with the tooltip `"Starting attempts opens in a later release"` instead of the live `<AttemptStartCta />`. Clicking it does nothing.

### What's already in place (no work needed)

| Layer | File | State |
|---|---|---|
| Backend `AttemptController` | `quiz_backend/src/modules/attempt/**` | ✅ 11 endpoints in `openapi.json` (start, abandon, complete, analytics, answers, review, etc.) |
| SDK function | `quiz_frontend/src/lib/api/generated/attempts/attempts.ts` | ✅ `attemptControllerStartAttempt` |
| Service wrapper | `quiz_frontend/src/features/attempts/services/attempts.service.ts:167-170` | ✅ `startAttempt(quizId, payload)` |
| Mutation hook | `quiz_frontend/src/features/attempts/hooks/useStartAttempt.ts` | ✅ 7-state discriminated `StartAttemptOutcome` |
| Start CTA component | `quiz_frontend/src/features/attempts/components/AttemptStartCta.tsx` | ✅ Auth + cooldown + 409/422/429 handling + router.push to `/attempt` |
| Active-attempt lookup | `quiz_frontend/src/features/attempts/hooks/useActiveAttempt.ts` | ✅ Driven by `getActiveAttempt(quizId)` |
| Continue CTA | `quiz_frontend/src/features/attempts/components/AttemptContinueCta.tsx` | ✅ Branch when active attempt exists |
| Runner page | `quiz_frontend/src/app/(protected)/quizzes/[idOrSlug]/attempt/page.tsx` | ✅ Renders `<AttemptRunnerPage>` |
| Runner shell + question flow | `features/attempts/components/AttemptRunner.tsx`, `AttemptQuestionCard.tsx`, `useAttemptRunner.ts`, `useSubmitAnswer.ts`, `useCompleteAttempt.ts` | ✅ All wired to live service calls |
| Cross-tab broadcast + Zustand store | `attempts-broadcast-channel.ts`, `useAttemptsStore.ts` | ✅ In place |
| Integration specs | `__tests__/AttemptStartCta.spec.tsx`, `__tests__/AttemptEntryCta.integration.spec.tsx`, `__tests__/QuizCtaStrip.live.spec.tsx`, `__tests__/AttemptRunner.integration.spec.tsx` | ✅ All mock `attempts_live='live'` and pass |

### What's missing — the single change

The `attempts_live` flag is set to `'placeholder'` by default. Flipping it to `'live'` will route `<QuizCtaStrip />` to the live `<AttemptStartCta />` branch, which calls the existing service hook end-to-end.

---

## 2. Scope decision

Based on the answers above, this plan is **minimal**: flip the flag, then verify the flow end-to-end against the running backend. The active-attempt lookup continues to use the client-side filter (`/users/me/attempts?quizId=…&status=started&limit=1`) — no new backend endpoint.

**Out of scope (deferred to a follow-up):**

- Dedicated `GET /quizzes/{quizId}/attempts/active` endpoint — the `getActiveAttempt` helper is already optimised for an empty-page response and adds zero visible latency.
- Reverting the `QuizCtaStrip` placeholder branch — keep it as a kill-switch so we can flip back to `'placeholder'` instantly if the live flow regresses.
- The other Phase 4 / 5 / 6 lanes (real-time infrastructure, tournaments, multiplayer) — they each have their own flag and their own work.

---

## 3. Implementation plan

### Step 1 — Flip the flag in the local dev environment

Add to `quiz_frontend/.env` (and `.env.example`):

```bash
NEXT_PUBLIC_ATTEMPTS_LIVE=live
```

- `.env` is read at process start; the Next.js dev server picks it up after a restart (`pnpm dev`).
- `.env.example` documents the flag for other contributors — keep it in sync.

### Step 2 — Verify the strip renders the live Start CTA

In the browser:

1. Log in as an authenticated user.
2. Open any **published** quiz detail page (`/quizzes/[idOrSlug]`).
3. **Expected:** the Start button is no longer disabled. The tooltip is gone. The CTA strip no longer shows the "Starting attempts opens in a later release" placeholder copy.
4. **Expected SWR calls** (Network tab):
   - `GET /api/v1/users/me/attempts?quizId={id}&status=started&limit=1` (the active-attempt probe) → `200 { data: [] }`.
   - When the Start button is clicked: `POST /api/v1/quizzes/{quizId}/attempts` → `201 { data: { attemptId, status: 'started', ... } }`.
   - Router navigates to `/quizzes/[idOrSlug]/attempt`.

### Step 3 — Walk the runner flow

From the runner page (`/quizzes/[idOrSlug]/attempt`):

1. Confirm the first question renders with the `AttemptHeader`, `AttemptProgressBar`, `AttemptAnswerPicker`, and `AttemptQuestionCard`.
2. Select an answer → `POST /api/v1/attempts/{attemptId}/answers` → `201 { data: { answerId, lockedAt } }`.
3. Navigate next → confirm the next question renders and the progress bar increments.
4. Submit the last answer → confirm the page either auto-routes to `/quizzes/[idOrSlug]/results` (via `useCompleteAttempt`) or surfaces a "Complete attempt" CTA.
5. On the results page, verify the score, breakdown, and "Write review" CTA.

### Step 4 — Cross-tab smoke check

1. Open the quiz detail page in two tabs.
2. Start an attempt in tab A.
3. **Expected in tab B:** within ≤1s the strip flips to `Continue` (driven by the `attempts/changed` broadcast channel revalidating `useActiveAttempt`).
4. Click `Continue` in tab B → it routes to the same `/attempt` page and renders the same runner state.

### Step 5 — Negative paths

| Scenario | Expected outcome |
|---|---|
| Click Start twice within 500 ms | Cooldown blocks the second call (no duplicate 201) |
| Backend returns `409 ATTEMPT_ALREADY_STARTED` | Toast: "You already have an in-progress attempt" → strip flips to `Continue` |
| Quiz is unpublished | `422 ATTEMPT_QUIZ_NOT_PUBLISHED` → toast + redirect back to `/quizzes/[idOrSlug]` |
| Backend returns `429` / `5xx` | `retryable` outcome → toast with retry copy → button stays enabled |
| Token expired mid-runner | Auth bootstrap re-runs → runner page redirects to `/login?redirect=/quizzes/.../attempt` |
| Network offline | `useStartAttempt` surfaces a typed `ApiError`; the runner does not crash |

### Step 6 — Existing integration specs

No spec changes are required — every test in `features/attempts/components/__tests__/` already mocks `isFeatureEnabled('attempts_live', …)` to return `'live'`. They serve as the regression net for this flip. Confirm they still pass:

```bash
cd quiz_frontend
pnpm vitest run src/features/attempts/components/__tests__/AttemptStartCta.spec.tsx
pnpm vitest run src/features/attempts/components/__tests__/AttemptEntryCta.integration.spec.tsx
pnpm vitest run src/features/attempts/components/__tests__/AttemptRunner.integration.spec.tsx
pnpm vitest run src/features/quizzes/components/__tests__/QuizCtaStrip.live.spec.tsx
```

(If any fail, the failure indicates a regression in the live flow — investigate before committing the flag flip.)

---

## 4. Rollback plan

If a regression surfaces in production after flipping the flag:

1. Revert `NEXT_PUBLIC_ATTEMPTS_LIVE=live` → unset (so the default `'placeholder'` wins again).
2. Redeploy.
3. Open a follow-up ticket and re-disable the flag in `feature-flags.ts:815` so a forgotten `.env` doesn't re-flip it on the next deploy.

The flag is intentionally still in the codebase as a kill-switch. Do **not** remove the `PlaceholderStrip` branch in this plan.

---

## 5. Files touched

| File | Change | Why |
|---|---|---|
| `quiz_frontend/.env` | Add `NEXT_PUBLIC_ATTEMPTS_LIVE=live` | Local dev environment gate |
| `quiz_frontend/.env.example` | Add the same line (commented or uncommented) | Document the flag for other contributors |
| `quiz_frontend/docs/frontend-backend-gap-plan.md` | Optional: add a one-line note that Phase 4 attempt lane is now live in dev | Audit-trail update |

**No code changes** to:

- `quiz_frontend/src/features/quizzes/components/QuizCtaStrip.tsx`
- `quiz_frontend/src/features/attempts/**`
- `quiz_frontend/src/lib/feature-flags/feature-flags.ts`
- Any backend file

---

## 6. Acceptance criteria

- [ ] `NEXT_PUBLIC_ATTEMPTS_LIVE=live` is set in `quiz_frontend/.env`.
- [ ] The same line is documented in `quiz_frontend/.env.example`.
- [ ] On a published quiz detail page, the Start button is enabled for an authenticated viewer with no active attempt.
- [ ] Clicking Start calls `POST /api/v1/quizzes/{quizId}/attempts`, then navigates to `/quizzes/[idOrSlug]/attempt`.
- [ ] The runner page renders question 1, accepts an answer, advances, and either completes or surfaces the "Complete attempt" CTA.
- [ ] Cross-tab: starting an attempt in tab A flips the CTA strip in tab B to `Continue` within ≤1s.
- [ ] All four existing attempts-related vitest specs still pass.
- [ ] `pnpm verify:contract-sync` still passes (this change does not touch the SDK or OpenAPI).

---

## 7. Out-of-scope follow-ups (not part of this plan)

These are real, but each warrants its own plan. Listing for traceability:

1. **Dedicated `GET /quizzes/{quizId}/attempts/active` endpoint** — eliminates the client-side filter, simplifies the SWR key, and removes the `limit: 1` + 404 empty-page dance. Trivial backend change (Nest controller + service method) plus a small frontend helper update.
2. **Strip the `PlaceholderStrip` branch** — once the live flow has been stable in production for a release cycle, drop the kill-switch and the dead "Starting attempts opens in a later release" copy.
3. **Phase 5 / 6 lanes** — `realtime_infrastructure_live`, `tournaments_live`, `multiplayer_play_live` each have their own pending work. Their flag gates are independent of `attempts_live`.
4. **Phase 5 — UX completion audit** — the post-flip runner audit for loading / empty / error / pagination states per the gap plan §6.5.
