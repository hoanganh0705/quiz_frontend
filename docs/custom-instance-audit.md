# custom-instance.ts Audit — Refresh-Shape Bug

> **Source ticket**: TKT-1.4.1.1 (Epic 1.4, US-1.4.1).
> **Subject file**: `quiz_frontend/src/lib/api/core/custom-instance.ts` (158 lines at planning time).
> **Purpose**: Record every `refreshResponse.data*` access, every `BroadcastChannel('auth')` postMessage site, and every `window.location.href = '/login'` redirect site in `custom-instance.ts`, with line numbers. Documents the refresh-shape bug at line 102 that this epic fixes.

---

## 1. The refresh-shape bug (line 102)

**Location**: `src/lib/api/core/custom-instance.ts:102`.

**Current code**:
```ts
const { accessToken } = refreshResponse.data.data.token;
```

**Why it fails**: The backend's `RefreshTokenResponseDto` declares `accessToken!: string` only — there is no `.token` sub-object on the wire. Source: `quiz_backend/src/modules/auth/dto/response/refresh-token-response.dto.ts` (10 lines, full content):

```ts
export class RefreshTokenResponseDto {
  @ApiProperty({ description: 'New JWT access token', example: 'eyJ…' })
  accessToken!: string;
}
```

**The wire shape end-to-end**:

1. HTTP body returned by `POST /api/v1/auth/refresh-token`: `{ data: { accessToken: string } }` (global envelope wraps every successful response).
2. The refresh request uses a **standalone** `axios.post(...)` on line 96 — it does NOT go through `customInstance`'s response interceptor. So `refreshResponse.data` is the full envelope: `{ data: { accessToken } }`.
3. The correct read is `refreshResponse.data.data.accessToken` (envelope → inner `data` → `accessToken`).
4. The current code reads `refreshResponse.data.data.token.accessToken` — the `.token` segment does not exist on the wire. Destructuring yields `undefined`. The `if (accessToken)` guard on line 104 then catches `undefined` and throws `Error('Refresh token response missing access token')`, falling into the `catch` block on line 120 which clears the token and bounces the user to `/login` — even though the refresh endpoint actually returned a valid token.

**Fix** (TKT-1.4.1.2): drop the `.token` segment. The corrected read is `refreshResponse.data.data.accessToken`.

**Cross-reference**: The integration master plan flags the same bug at `INTEGRATION_MASTER_PLAN.md:149`:

> The comment header in `customInstance.ts` reads `refreshResponse.data.data.token.accessToken` — backend returns `refreshResponse.data.data` with `{ accessToken, expiresIn }` directly, not nested under `token`

(Note: the master plan mentions `expiresIn`, but the backend's current `RefreshTokenResponseDto` does NOT emit `expiresIn`. This is a documented drift; the DTO field list will be reconciled in Phase 5.)

---

## 2. Every `refreshResponse.data*` access

| Line | Code | Purpose |
|------|------|---------|
| 102  | `const { accessToken } = refreshResponse.data.data.token;` | **BUG** — reads non-existent `.token` sub-object. |

That's the only `refreshResponse.data*` access in the file. The refresh branch is the sole consumer of the refresh response.

---

## 3. Every `BroadcastChannel('auth')` postMessage site

| Line | Event type | Payload | Trigger condition |
|------|-----------|---------|-------------------|
| 109–112 | `'TOKEN_REFRESHED'` | `{ type, accessToken }` | Refresh succeeds (line 104 `if (accessToken)` branch). |
| 124  | `'LOGGED_OUT'` | `{ type }` | Refresh endpoint returns an error (catch on line 120). |
| 139  | (listener registration) | n/a | Module load (top-level `if (typeof window !== 'undefined')`). |

All postMessage sites use `new BroadcastChannel('auth').postMessage(...)` directly — a fresh instance is created per call (no module-level reference retained). This is acceptable for one-shot sends but creates GC churn. Not fixed by Epic 1.4 (deferred).

Listener (lines 140–148) handles both `'TOKEN_REFRESHED'` and `'LOGGED_OUT'` correctly. Verified by TKT-1.4.3.1 (cross-tab listener audit).

---

## 4. Every `window.location.href = '/login'` redirect site

| Line | Code context | Trigger condition |
|------|-------------|-------------------|
| 86  | Inside the cooldown / `_retry` bounce branch | When a 401 lands on a request that has `_retry = true` OR `now - lastRefreshAttempt < REFRESH_COOLDOWN_MS`. Note: this path is itself broken (see TKT-1.4.2.1) — the cooldown never actually blocks concurrent 401s. |
| 128 | Inside the refresh `catch` block | When the refresh endpoint itself fails (refresh error or network error). |
| 146 | Inside the `BroadcastChannel('auth')` listener for `LOGGED_OUT` | When another tab logs out and broadcasts `LOGGED_OUT`. |

Three redirect sites, all to `/login`. Consistent. No drift.

---

## 5. Plan summary

The bug at line 102 is the load-bearing fix for US-1.4.1. TKT-1.4.1.2 changes line 102 from `refreshResponse.data.data.token.accessToken` to `refreshResponse.data.data.accessToken` (one-segment deletion). The broadcast payload on lines 109–112 gains a `timestamp: Date.now()` field in TKT-1.4.1.3. The cooldown-based bounce on lines 82–89 is removed entirely in TKT-1.4.2.3 (replaced by `inFlightRefresh`). The listener on lines 138–149 stays unchanged (verified by TKT-1.4.3.1).