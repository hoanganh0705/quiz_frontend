# Cross-Tab Listener Audit — `BroadcastChannel('auth')`

> **Source ticket**: TKT-1.4.3.1 + TKT-1.4.3.2 + TKT-1.4.3.3 (folded).
> **Subject file**: `quiz_frontend/src/lib/api/core/custom-instance.ts` lines 164–175.
> **Purpose**: Verify that the cross-tab BroadcastChannel listener correctly handles both `TOKEN_REFRESHED` and `LOGGED_OUT` event types, and document the intentional asymmetry (listener registered only in `customInstance`, not `authOnlyInstance`).

---

## 1. Listener block (current shape)

`quiz_frontend/src/lib/api/core/custom-instance.ts:164-175`:

```ts
if (typeof window !== 'undefined') {
  const channel = new BroadcastChannel('auth');
  channel.onmessage = (event) => {
    if (event.data.type === 'TOKEN_REFRESHED') {
      setAuthToken(event.data.accessToken);
    }
    if (event.data.type === 'LOGGED_OUT') {
      clearAuthToken();
      window.location.href = '/login';
    }
  };
}
```

The listener is module-level: it runs once at module load, inside a `typeof window !== 'undefined'` guard so it is inert in SSR / node mode.

---

## 2. `TOKEN_REFRESHED` branch — verified correct

**Listener line 167–169**:
```ts
if (event.data.type === 'TOKEN_REFRESHED') {
  setAuthToken(event.data.accessToken);
}
```

**Producer payload** (custom-instance.ts:152-156, `doRefresh()`):
```ts
new BroadcastChannel('auth').postMessage({
  type: 'TOKEN_REFRESHED',
  accessToken,
  timestamp: Date.now(),
});
```

**Shape match**: the listener reads `event.data.type` and `event.data.accessToken`. The producer emits both. The `timestamp` field is forward-compat (TKT-1.4.1.3 + TKT-1.4.1.4 deferred to Phase 5); the listener ignores it, which is correct.

**Action**: calls `setAuthToken(event.data.accessToken)`. `setAuthToken` is defined in `quiz_frontend/src/features/auth/utils/auth-cookies.ts:54` and writes the cookie + dispatches an internal `auth-state-change` event on `window`. Confirmed by reading the source.

**Verdict**: ✅ correct.

---

## 3. `LOGGED_OUT` branch — verified correct

**Listener line 170–173**:
```ts
if (event.data.type === 'LOGGED_OUT') {
  clearAuthToken();
  window.location.href = '/login';
}
```

**Producer payload** (custom-instance.ts:114, in the refresh-failure catch):
```ts
new BroadcastChannel('auth').postMessage({ type: 'LOGGED_OUT' });
```

**Shape match**: `event.data.type === 'LOGGED_OUT'`. The producer emits `{ type: 'LOGGED_OUT' }` with no other fields. The listener does not read any other field — correct.

**Actions**:
1. `clearAuthToken()` — clears both `auth_token` and `refresh_token` cookies (auth-cookies.ts:93-101). The cookie-jar is reset to logged-out state in this tab.
2. `window.location.href = '/login'` — hard navigation. **Note**: this listener path uses an unguarded `window.location.href = '/login'`, unlike the producer path on custom-instance.ts:117 which guards with `typeof window !== 'undefined'`. The listener is itself inside an `if (typeof window !== 'undefined')` block, so `window` is always defined when this runs. The unguarded assignment is safe by structural containment.

**Redirect target consistency**: same `/login` destination as the in-tab redirect sites on lines 95 and 118. All three redirect sites converge to the same URL — consistent.

**Verdict**: ✅ correct.

---

## 4. Asymmetry: listener registered only in `customInstance`

`auth-only-instance.ts` (30 lines total) does **not** register a `BroadcastChannel('auth')` listener. Verified by `grep -n "BroadcastChannel" src/lib/api/core/auth-only-instance.ts` returning no matches.

This is intentional:

- `customInstance` is the axios instance used for all **authenticated** endpoints. When tab A refreshes the token, tab B (which is also using `customInstance`) needs to learn the new token via the broadcast — otherwise tab B's next request will 401 again.
- `authOnlyInstance` is used for login/register/refresh itself. These endpoints run BEFORE the user is logged in (login/register) OR during the refresh handshake (refresh). Tab B's auth-only flow does not need to observe token broadcasts because:
  - On login: tab A successfully logs in; tab B's auth-only login isn't in progress; tab B's `customInstance` calls will benefit from the next refresh tick (tab B might still be on the stale cookie, but the next 401 will trigger a fresh refresh).
  - On register/refresh: same logic.

The asymmetry is structurally correct and there is no functional gap.

**Verdict**: ✅ correct, intentional.

---

## 5. Listener registration count across the codebase

| File | Listeners registered |
|------|---------------------|
| `custom-instance.ts` | 1 (lines 164–175) |
| `auth-only-instance.ts` | 0 |

No duplicate listeners. No listeners registered inside the response interceptor (which would cause a per-request listener leak). The single module-level registration is the correct architectural choice.

---

## 6. Note: deferred work

- T-1.4.3.4 (`LOGIN` event) is **deferred to Phase 2** per the parent epic. The current code does not emit or handle a `LOGIN` event because Phase 1's auth surface is refresh-only; full Phase 2 will introduce login flows that broadcast `LOGGED_IN` to coordinate cross-tab login state.
- No ticket is filed here for `LOGIN` handling. TKT-1.4.3.5 covers only the existing `TOKEN_REFRESHED` and `LOGGED_OUT` branches.

---

## 7. Open observations (not blocking, documented for future work)

- The listener block creates a `BroadcastChannel` instance per module load. If `custom-instance.ts` is hot-reloaded (e.g. during dev with HMR), each reload adds another listener without removing the old one. This is a Vite/Next.js HMR concern, not a runtime bug. Production builds bundle once.
- The listener uses `if (event.data.type === ...)` rather than a switch statement. Both branches run unconditionally per message — the second `if` will fire only if `event.data.type === 'LOGGED_OUT'`, but the structure is two sequential `if`s instead of a switch. Cosmetic only.