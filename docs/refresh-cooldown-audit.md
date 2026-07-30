# Refresh Cooldown Audit — `_retry` + `REFRESH_COOLDOWN_MS` Logic

> **Source ticket**: TKT-1.4.2.1 + TKT-1.4.2.2 (folded).
> **Subject code**: `quiz_frontend/src/lib/api/core/custom-instance.ts` lines 31–32, 81–92.
> **Purpose**: Document the cooldown-based bounce logic, identify the drift (cooldown never actually blocks concurrent 401s), and recommend the `inFlightRefresh` mechanism as a replacement.

---

## 1. The current cooldown pattern

**Module-level state** (lines 31–32):

```ts
const REFRESH_COOLDOWN_MS = 1000;
let lastRefreshAttempt = 0;
```

**The check + update** (lines 81–92):

```ts
// Prevent concurrent refresh attempts
const now = Date.now();
if (originalRequest._retry || now - lastRefreshAttempt < REFRESH_COOLDOWN_MS) {
  clearAuthToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
  return Promise.reject(error);
}

originalRequest._retry = true;
lastRefreshAttempt = now;
```

Two flags interact here:

- **`originalRequest._retry`** — a per-request flag. Prevents the **same** request from triggering two refresh attempts (e.g. if the refresh itself returns 401 and the retry hits another 401). This flag is correct as designed.
- **`REFRESH_COOLDOWN_MS` + `lastRefreshAttempt`** — a module-level timestamp. Intended to prevent **concurrent** requests from triggering parallel refresh attempts.

---

## 2. The drift — cooldown never blocks parallel 401s

`lastRefreshAttempt` is updated on line 92, **only after** the cooldown check on line 83 passes. This means:

- **First request** in a refresh sequence: `lastRefreshAttempt = 0` (initial), passes the cooldown check, fires a refresh, sets `lastRefreshAttempt = now` on line 92.
- **Second request** arriving within `REFRESH_COOLDOWN_MS` of the first: passes the cooldown check **only if** the first request's `lastRefreshAttempt = now` assignment has already run. **But** the assignment runs synchronously on line 92 inside the same error-interceptor callback that just dispatched the refresh, so by the time the second request's error interceptor runs (likely queued behind the first in the event loop), `lastRefreshAttempt` should already be updated.

**Wait — that's actually correct in the synchronous case.** Let me re-read…

The drift is more subtle. The current code says:

```ts
if (originalRequest._retry || now - lastRefreshAttempt < REFRESH_COOLDOWN_MS) {
```

`originalRequest._retry` is set on line 91 (`originalRequest._retry = true`) **before** the refresh fires. So if two requests both arrive at the interceptor simultaneously, both see `_retry = undefined`, both pass the cooldown check (assuming `lastRefreshAttempt` was already updated, which is the synchronous case), and both set `_retry = true` on their respective `originalRequest` objects — but those are **different request objects**, so setting `_retry = true` on one does not affect the other.

The actual race is: two parallel requests both arrive at the interceptor. Both have `_retry = undefined`. Both see `lastRefreshAttempt = 0` (or some older value). Both pass the cooldown check. Both call `axios.post('/auth/refresh-token')` (line 96). **Two refresh calls fire.** That's the drift — the cooldown check has no effect on the **first** request after a quiet period, and `_retry` is per-request not per-instance.

The cooldown **would** correctly bounce a second request arriving *after* the first request's `lastRefreshAttempt = now` assignment, but only if the second request arrives **after** the synchronous code path through line 92. In practice, the `axios.post(...)` on line 96 is `await`-ed (line 96–100 are inside `try { ... await ... }`), so the synchronous path through line 92 completes BEFORE the second request's error interceptor runs. By that point `lastRefreshAttempt` is updated and the cooldown DOES bounce the second request — but it bounces it to `/login`, which is the wrong behaviour.

**The right behaviour**: the second concurrent request should **share** the in-flight refresh, get the new token, and retry its own request — NOT bounce to `/login`. The current code bounces to `/login`.

So the drift has two faces:
1. **In the synchronous edge** (rare): two requests fire two refresh calls. Both succeed, both retry their own requests, the user is fine. Bad: 2× refresh traffic.
2. **In the normal edge** (common): the first request sets `lastRefreshAttempt = now`, then awaits `axios.post`. The second request arrives during the await, sees `lastRefreshAttempt = now`, `now - lastRefreshAttempt < REFRESH_COOLDOWN_MS` evaluates to `< 1000ms` → bounces to `/login`. **This is wrong**: the user is logged out for a normal concurrent request that could have shared the in-flight refresh.

---

## 3. Recommendation

Drop the `now - lastRefreshAttempt < REFRESH_COOLDOWN_MS` branch entirely from the bounce path. Replace it with an `inFlightRefresh: Promise<string> | null` mechanism (introduced in TKT-1.4.2.3) that:

- When the first request triggers a refresh, sets `inFlightRefresh` to a Promise<string> that resolves with the new access token.
- When a second request arrives during the refresh, `await`s the same `inFlightRefresh` Promise instead of firing a new refresh call.
- When the Promise resolves (success or failure), a `finally` block sets `inFlightRefresh = null` so subsequent refreshes (5 minutes later, legitimate) can fire fresh.

The `REFRESH_COOLDOWN_MS` constant and `lastRefreshAttempt` variable become unused and can be deleted.

---

## 4. Why the original code was written this way (hypothesis)

The `REFRESH_COOLDOWN_MS` pattern reads as a "throttle" — a single global gate. The intent might have been: if a refresh failed recently, don't try again for 1 second. That's defensible against a *flapping* backend (refresh endpoint returning intermittent 500s). But it's the wrong tool for the *parallel request* problem, which needs Promise-sharing, not throttling. The two cases are different:

- **Parallel requests, refresh in flight**: share the in-flight Promise. Don't bounce.
- **Refresh flapping**: retry with backoff. (Out of scope for Epic 1.4; Phase 5+ concern.)

The audit's recommendation is the right primitive for case 1.

---

## 5. Verification of the drift

The drift is observable: open two browser tabs, both authenticated, both on a page that issues an authenticated request. Force a token expiry in tab A (clear the auth cookie). The tab A request hits 401, the cooldown check passes (because `lastRefreshAttempt = 0`), the refresh fires. Tab B's request hits 401 a moment later. The cooldown check evaluates `< 1000ms`, tab B is bounced to `/login`. The user is logged out of tab B even though the refresh in tab A succeeded.

This is the user-visible symptom of the drift. TKT-1.4.2.3 + TKT-1.4.2.4 fix it.