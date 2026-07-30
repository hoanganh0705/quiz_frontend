# Refresh-Shape Fix — Trace

> **Source ticket**: TKT-1.4.1.2 (Epic 1.4, US-1.4.1).
> **Subject file**: `quiz_frontend/src/lib/api/core/custom-instance.ts:102`.

---

## Change

**Before** (line 102):
```ts
const { accessToken } = refreshResponse.data.data.token;
```

**After** (line 102):
```ts
const { accessToken } = refreshResponse.data.data;
```

Single-segment deletion: removed `.token`. The destructuring now reads the wire shape the backend actually emits (`{ data: { accessToken } }`), not a non-existent `.token` sub-object.

---

## Why the read is `refreshResponse.data.data` (two `.data` levels)

The refresh request uses a **standalone** `axios.post(...)` on line 96 — it does NOT go through `customInstance`'s response interceptor. Therefore:

1. HTTP body from `POST /api/v1/auth/refresh-token`:
   ```json
   { "data": { "accessToken": "eyJ..." } }
   ```
   (global envelope `{ data, meta }` wraps every successful response).
2. `refreshResponse.data` is the full envelope: `{ data: { accessToken } }`.
3. `refreshResponse.data.data` is the inner body: `{ accessToken }`.
4. Destructuring `{ accessToken } = refreshResponse.data.data` yields the token string.

The `if (accessToken)` guard on line 104 stays as-is. It still fires when the backend genuinely omits `accessToken` (e.g. an internal error returns `{ data: {} }` with no `accessToken`).

---

## Manual test note

1. Boot the backend.
2. Log in via the UI (sets the auth cookie via `setAuthToken`).
3. Manually expire the token: open DevTools → Application → Cookies → delete the `auth-token` cookie. (Or call `clearAuthToken()` from the console if it's exposed.)
4. Trigger any authenticated endpoint (e.g. navigate to a page that calls `/users/me`).
5. **Before the fix**: the refresh branch destructures `undefined`, the `if (accessToken)` guard fails, the `catch` block clears the token and bounces to `/login`. User is logged out despite a valid refresh token in the cookie.
6. **After the fix**: the refresh branch destructures the real token, `setAuthToken` writes the new cookie, `customInstance(originalRequest)` retries with the new token. Request succeeds.

---

## Verification

```bash
# Visual diff (line 102):
git diff src/lib/api/core/custom-instance.ts
# Expect: 1 line changed, "+const { accessToken } = refreshResponse.data.data;"

# Type check:
pnpm exec tsc --noEmit 2>&1 | grep "custom-instance"
# Expect: 0 lines.

# grep confirmation:
grep -n "refreshResponse.data" src/lib/api/core/custom-instance.ts
# Expect: 102:      const { accessToken } = refreshResponse.data.data;
```

---

## Related drift (documented, NOT fixed in this ticket)

The integration master plan (`INTEGRATION_MASTER_PLAN.md:149`) notes that the refresh response should include `expiresIn`. The backend's `RefreshTokenResponseDto` does NOT currently emit `expiresIn`. If/when the DTO is extended, TKT-1.4.1.4 (Phase 5) wires `expiresIn` through. The current ticket does not add `expiresIn` to the destructuring — `accessToken` is the only field on the wire today.