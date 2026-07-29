# Epic 1.2 — Auth Wrapper Endpoint Inventory

> **Source ticket**: TKT-1.2.2.1
> **Parent epic**: Epic 1.2 — SDK Regeneration & Barrel Consolidation
> **Target file**: `quiz_frontend/src/features/auth/wrappers/auth.wrapper.ts`
> **Generated**: 2026-07-29 against `quiz_frontend/` on branch `main`.

## Endpoint inventory

| Function | HTTP method | Path | Current call style | SDK equivalent | Preserved side-effects |
|---|---|---|---|---|---|
| `register(payload)` | POST | `/api/v1/auth/register` | `authOnlyInstance.post` | `getAuth().authControllerRegister(payload)` | none |
| `login(payload)` | POST | `/api/v1/auth/login` | `authOnlyInstance.post` | `getAuth().authControllerLogin(payload)` | `setAuthToken(data.accessToken)`; `BroadcastChannel('auth').postMessage({ type: 'TOKEN_REFRESHED', accessToken })` |
| `verifyEmail(payload)` | POST | `/api/v1/auth/verify-email` | `authOnlyInstance.post` | `getAuth().authControllerVerifyEmail(payload)` | none |
| `resendVerificationEmail(payload)` | POST | `/api/v1/auth/resend-verification-email` | `authOnlyInstance.post` | `getAuth().authControllerResendVerificationEmail(payload)` | none |
| `logout()` | POST | `/api/v1/auth/logout` | `customInstance.post` | `getAuth().authControllerLogout()` | `clearAuthToken()`; `BroadcastChannel('auth').postMessage({ type: 'LOGGED_OUT' })` (in `finally` block) |
| `logoutAll()` | POST | `/api/v1/auth/logout-all` | `customInstance.post` | `getAuth().authControllerLogoutAll()` | `clearAuthToken()`; `BroadcastChannel('auth').postMessage({ type: 'LOGGED_OUT' })` (in `finally` block) |

Total: 6 functions, 6 endpoints, 3 side-effect-bearing functions (`login`, `logout`, `logoutAll`).

## SDK availability check

Every endpoint above has a matching SDK builder. Cross-referenced against `src/lib/api/generated/auth/auth.ts` at the time of this ticket:

- `getAuth` (default export)
- `getAuth().authControllerRegister(payload)` ✅
- `getAuth().authControllerLogin(payload)` ✅
- `getAuth().authControllerVerifyEmail(payload)` ✅
- `getAuth().authControllerResendVerificationEmail(payload)` ✅
- `getAuth().authControllerLogout()` ✅
- `getAuth().authControllerLogoutAll()` ✅

Result types are also exported from the SDK (`AuthControllerLoginResult`, `AuthControllerLogoutResult`, etc.) but the wrapper will keep its existing feature-facing types (`LoginResponse`, `LogoutResponse`, …) from `@/features/auth/types` to preserve stable import paths.

## Type-shape diff

Cross-checked all 6 wrapper request/response types against the SDK's DTOs at the time of this ticket:

| Wrapper type (from `@/features/auth/types`) | SDK DTO (from `@/lib/api/generated/schemas`) | Match |
|---|---|---|
| `LoginRequest` (email, password) | `LoginDto` (email, password) | exact |
| `RegisterRequest` (username, email, password) | `RegisterDto` (username, email, password) | exact |
| `VerifyEmailRequest` (token) | `VerifyEmailDto` (token) | exact |
| `ResendVerificationRequest` (email) | `ResendVerificationDto` (email) | exact |
| `LoginResponse` (userId, username, email, accessToken) | `LoginResponseDto` (userId, username, email, accessToken) | exact |
| `RegisterResponse` (message) | `RegisterResponseDto` (message) | exact |
| `VerifyEmailResponse` (message) | `VerifyEmailResponseDto` (message) | exact |
| `LogoutResponse` (message) | `LogoutResponseDto` (message) | exact |

**Zero divergences.** All wrapper types are byte-for-byte compatible with their SDK counterparts. No follow-up issues filed.

Note: `resendVerificationEmail` in the wrapper returns `Promise<VerifyEmailResponse>` (not a separate `ResendVerificationResponse`), and the SDK's `authControllerResendVerificationEmail` returns `AuthControllerResendVerificationEmailResult` which is structurally compatible with `VerifyEmailResponseDto`. Confirmed by reading the `orval` `Result` type alias.

## Migration order

The 6 functions can be migrated in any order — none has a runtime dependency on another, and the signatures are independent. For clarity in the PR, the suggested order is:

1. `register`, `verifyEmail`, `resendVerificationEmail` — no side-effects, simplest cases.
2. `login` — adds `setAuthToken` + BroadcastChannel glue.
3. `logout`, `logoutAll` — adds `clearAuthToken` + BroadcastChannel glue in `finally`.

The single-PR commit captures the entire rewrite — there are no intermediate states where the wrapper would be "half-migrated" in a way that breaks callers, because every call site imports the wrapper by name (`login`, `logout`, …) and the names are preserved.

## Files modified

- `quiz_frontend/docs/auth-wrapper-inventory.md` (new, this file).
- No source files modified in this ticket (TKT-1.2.2.1 is observational).