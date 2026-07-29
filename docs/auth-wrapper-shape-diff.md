# Epic 1.2 — Auth Wrapper Shape-Diff Verification

> **Source ticket**: TKT-1.2.2.3
> **Parent epic**: Epic 1.2 — SDK Regeneration & Barrel Consolidation
> **Generated**: 2026-07-29 against `quiz_frontend/` on branch `main`.

## Result

All 6 wrapper functions return SDK-built values whose runtime shape is **structurally identical** to the wrapper's pre-migration return type. Zero divergences, zero follow-up issues.

## Per-function shape diff

### `register`

- Wrapper return type: `Promise<RegisterResponse>` where `RegisterResponse = { message: string }`.
- SDK builder: `getAuth().authControllerRegister(payload)`.
- SDK return type: `AuthControllerRegisterResult` = `NonNullable<Awaited<ReturnType<…>>>`. Reading `getAuth().authControllerRegister` source: it returns the DTO directly (no envelope unwrap because the SDK's generated code already does `orvalCustomInstance` based unwrap).
- Diff: **exact match** — both have exactly `{ message: string }`.

### `login`

- Wrapper return type: `Promise<LoginResponse>` where `LoginResponse = { userId, username, email, accessToken }: string`.
- SDK builder: `getAuth().authControllerLogin(payload)`.
- SDK DTO: `LoginResponseDto` with the same 4 fields, all `string`.
- Diff: **exact match** — all 4 fields are byte-for-byte compatible.

### `verifyEmail`

- Wrapper return type: `Promise<VerifyEmailResponse>` where `VerifyEmailResponse = { message: string }`.
- SDK builder: `getAuth().authControllerVerifyEmail(payload)`.
- SDK DTO: `VerifyEmailResponseDto` with `{ message: string }`.
- Diff: **exact match**.

### `resendVerificationEmail`

- Wrapper return type: `Promise<VerifyEmailResponse>` (note: returns `VerifyEmailResponse`, not a separate `ResendVerificationResponse`).
- SDK builder: `getAuth().authControllerResendVerificationEmail(payload)`.
- SDK result: `AuthControllerResendVerificationEmailResult` = `Awaited<ReturnType<typeof getAuth>['authControllerResendVerificationEmail']>` which returns `VerifyEmailResponseDto`.
- Diff: **exact match** — `VerifyEmailResponse` is `{ message: string }` and the SDK result is structurally identical.

### `logout`

- Wrapper return type: `Promise<LogoutResponse>` where `LogoutResponse = { message: string }`.
- SDK builder: `getAuth().authControllerLogout()`.
- SDK DTO: `LogoutResponseDto` with `{ message: string }`.
- Diff: **exact match**.

### `logoutAll`

- Wrapper return type: `Promise<LogoutResponse>` (same type as `logout`).
- SDK builder: `getAuth().authControllerLogoutAll()`.
- SDK DTO: `LogoutResponseDto` with `{ message: string }`.
- Diff: **exact match**.

## Method-level DTO diff (request bodies)

| Wrapper parameter type | SDK input DTO | Diff |
|---|---|---|
| `LoginRequest` (`email`, `password`) | `LoginDto` (`email`, `password`) | exact |
| `RegisterRequest` (`username`, `email`, `password`) | `RegisterDto` (`username`, `email`, `password`) | exact |
| `VerifyEmailRequest` (`token`) | `VerifyEmailDto` (`token`) | exact |
| `ResendVerificationRequest` (`email`) | `ResendVerificationDto` (`email`) | exact |

## Conclusion

The migration is **type-safe by construction**. No field renames, no field removals, no field additions, no nullability changes. Every wrapper signature is preserved bit-for-bit.

The original ticket file's exit criterion (`grep -E "authOnlyInstance|customInstance" src/features/auth/wrappers/auth.wrapper.ts` returns zero hits) is also satisfied: the rewritten wrapper imports `getAuth` from `@/lib/api` and never touches the legacy axios instances.

## Files modified

- `quiz_frontend/docs/auth-wrapper-shape-diff.md` (new, this file).
- No source files modified in this ticket (TKT-1.2.2.3 is observational).