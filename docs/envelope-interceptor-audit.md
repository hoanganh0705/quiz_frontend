# Envelope Interceptor Audit

> **Source ticket**: TKT-1.4.4.1 (Epic 1.4, US-1.4.4).
> **Subject files**:
> - `quiz_frontend/src/lib/api/core/custom-instance.ts` (lines 57–65).
> - `quiz_frontend/src/lib/api/core/auth-only-instance.ts` (lines 22–29).
> **Purpose**: Record the two duplicated envelope-unwrap blocks, note the asymmetry between the two instances, and confirm the planned extraction to `src/lib/api/core/unwrap.ts` (TKT-1.4.4.2) is safe.

---

## 1. The two duplicated blocks

### 1.1 `customInstance` — lines 57–65

```ts
customInstance.interceptors.response.use(
  // Success: unwrap { data, meta } → T
  (response) => {
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      response.data = payload.data;
    }
    return response;
  },

  // Error: handle 401 token refresh
  async (error) => { ... }
);
```

**Type**: response success handler (first argument to `interceptors.response.use`). Single-statement body: read `response.data`, check it's an object with a `data` property, replace `response.data` with `payload.data`.

### 1.2 `authOnlyInstance` — lines 22–29

```ts
// Response interceptor: unwrap { data, meta } → T
authOnlyInstance.interceptors.response.use((response) => {
  const payload = response.data;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    response.data = payload.data;
  }
  return response;
});
```

**Type**: response success handler. **Identical body** to the `customInstance` block above. Same four-line logic.

---

## 2. Line-by-line comparison

| Line | `custom-instance.ts` | `auth-only-instance.ts` |
|------|---------------------|-------------------------|
| 60 / 24 | `const payload = response.data;` | `const payload = response.data;` |
| 61 / 25 | `if (payload && typeof payload === 'object' && 'data' in payload) {` | `if (payload && typeof payload === 'object' && 'data' in payload) {` |
| 62 / 26 | `response.data = payload.data;` | `response.data = payload.data;` |
| 63 / 27 | `}` | `}` |
| 64 / 28 | `return response;` | `return response;` |

**Verdict**: byte-for-byte identical 4-line block. Pure duplication.

---

## 3. Asymmetry: error interceptors

| Instance | Success interceptor | Error interceptor |
|----------|--------------------|--------------------|
| `customInstance` (line 57) | **YES** (lines 59–65) | **YES** (lines 67–133) — handles 401 → refresh |
| `authOnlyInstance` (line 23) | **YES** (lines 23–29) | **NO** — intentional, because triggering a refresh inside the refresh-call itself would loop |

The asymmetry is intentional. `authOnlyInstance` exists precisely so login/register/refresh endpoints can hit 401 (bad credentials, expired refresh cookie) **without** triggering a token refresh on the same instance. **The extraction must NOT add an error interceptor to `authOnlyInstance`** — that would re-introduce the loop the asymmetry was designed to prevent.

---

## 4. Extraction plan (TKT-1.4.4.2 + TKT-1.4.4.3)

Extract the 4-line block to:

```
quiz_frontend/src/lib/api/core/unwrap.ts
```

with signature (pure function, no side effects):

```ts
export function unwrapEnvelope<T = unknown>(response: { data: unknown }): { data: T } {
  const payload = response.data;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return { data: (payload as { data: T }).data };
  }
  return response as { data: T };
}
```

Then:

- `custom-instance.ts` success interceptor body becomes:
  ```ts
  (response) => unwrapEnvelope(response)
  ```
- `auth-only-instance.ts` success interceptor body becomes the same one-liner.

Both call sites get the same semantics. No behavioural change. The asymmetry (no error interceptor on `authOnlyInstance`) is preserved by structural choice — the `unwrap.ts` helper is **only** used inside the success interceptor of each instance, never inside an error interceptor.

---

## 5. Test coverage (TKT-1.4.4.4)

A new spec file `unwrap.spec.ts` covers:

- Input `{ data: { foo: 1 } }` → output `{ data: { foo: 1 } }` (envelope present, unwrapped).
- Input `{ foo: 1 }` → output `{ data: { foo: 1 } }` (no envelope, passes through).
- Input `null` → output `{ data: null }`.
- Input `'string'` → output `{ data: 'string' }`.

These cases mirror the four-branch truth table of the inline check and lock in the contract for both instances.

---

## 6. Risk assessment

- **Risk**: type assertion `(payload as { data: T }).data` could mask a malformed payload at runtime.
- **Mitigation**: the original 4-line block uses `payload.data` directly (untyped), so the runtime behaviour is identical. The `as` cast is purely a TypeScript convenience — no runtime test assertion is weakened.
- **Risk**: extracting a function could introduce a circular import if `unwrap.ts` ends up importing from one of the instances.
- **Mitigation**: `unwrap.ts` will have zero imports (it's pure). Confirmed by inspection of the planned signature.