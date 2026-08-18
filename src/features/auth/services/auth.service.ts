

import {
AuthControllerCheckEmailParams,
AuthControllerCheckUsernameParams,
getAuth,
} from "@/lib/api";
import {
setAuthToken,
clearAuthToken,
} from "@/features/auth/utils/auth-cookies";
import { clearAllAuthCache } from "@/features/auth/utils/user-scoped-cache";
import { clearAuthState } from "@/features/auth/utils/clear-auth-state";
import {
broadcastAuthEvent,
type LoggedInEvent,
} from "@/lib/api/core/broadcast-channel";
import { clearVerificationFlags } from "@/features/auth/utils/verification-flag";
import type {
AuthControllerCheckEmailResult,
AuthControllerCheckUsernameResult,
AuthControllerForgotPasswordResult,
AuthControllerGetActiveSessionsResult,
AuthControllerGoogleLoginResult,
AuthControllerLoginResult,
AuthControllerLogoutResult,
AuthControllerLogoutAllResult,
AuthControllerRegisterResult,
AuthControllerResendVerificationEmailResult,
AuthControllerResetPasswordResult,
AuthControllerVerifyEmailResult,
} from "@/lib/api/generated/auth/auth";
import type {
AccountSecurityDto,
ChangePasswordDto,
ChangePasswordResponseDto,
DeleteAccountDto,
DeleteAccountResponseDto,
SessionListResponseDto,
SessionManagementResultDto,
VerifyPasswordDto,
VerifyPasswordResponseDto,
} from "@/lib/api";
import type { LoginResponseDto } from "@/lib/api/generated/schemas/loginResponseDto";
import {
AuthControllerChangePasswordResult,
AuthControllerDeleteAccountResult,
AuthControllerVerifyPasswordResult,
} from "@/lib/api/generated/auth/auth";
import { ApiError } from "@/lib/api/core/ApiError";
import { mutate as globalMutate } from "swr";

function broadcastLogin(userId: string, accessToken: string): void {
const event: Omit<LoggedInEvent, "tabId" | "timestamp"> = {
type: "LOGGED_IN",
userId,
accessToken,
  };
broadcastAuthEvent(event);
}

function broadcastLogout(): void {
broadcastAuthEvent({ type: "LOGGED_OUT" });
}

function broadcastTokenRefreshed(accessToken: string): void {
broadcastAuthEvent({
type: "TOKEN_REFRESHED",
accessToken,
  });
}

export function broadcastAuth(event: Parameters<typeof broadcastAuthEvent>[0]): void {
broadcastAuthEvent(event);
}

export async function checkEmail(
params: AuthControllerCheckEmailParams,
): Promise<AuthControllerCheckEmailResult> {
return getAuth().authControllerCheckEmail(params);
}

export async function checkUsername(
params: AuthControllerCheckUsernameParams,
): Promise<AuthControllerCheckUsernameResult> {
return getAuth().authControllerCheckUsername(params);
}

export async function register(
dto: Parameters<ReturnType<typeof getAuth>["authControllerRegister"]>[0],
): Promise<AuthControllerRegisterResult> {
return getAuth().authControllerRegister(dto);
}

export async function login(
dto: Parameters<ReturnType<typeof getAuth>["authControllerLogin"]>[0],
): Promise<AuthControllerLoginResult> {

const wire = await getAuth().authControllerLogin(dto);
if (!wire || (wire as { data?: unknown }).data === undefined) {
throw new Error("Login response missing data envelope");
  }
const data = (wire as { data: LoginResponseDto }).data;
const accessToken = data.accessToken;

setAuthToken(accessToken);

const userId = data.userId ?? "";

if (userId) {
broadcastLogin(userId, accessToken);
  }

if (typeof window !== 'undefined') {
try {
void globalMutate(
() => true,
undefined,
{ revalidate: true },
      );
    } catch {
      // Fail-open — the cookie set + broadcast above already
      // succeeds, and the next consumer render will refetch against
      // the new token anyway (the old `auth_token` cookie is gone).
    }
  }

broadcastTokenRefreshed(accessToken);

return data as unknown as AuthControllerLoginResult;
}

export async function googleLogin(
idToken: string,
): Promise<AuthControllerGoogleLoginResult> {

const wire = await getAuth().authControllerGoogleLogin({
idToken,
  });
if (!wire || (wire as { data?: unknown }).data === undefined) {
throw new Error("Google login response missing data envelope");
  }
const data = (wire as { data: LoginResponseDto }).data;
const accessToken = data.accessToken;

setAuthToken(accessToken);

const userId = data.userId ?? "";

if (userId) {
broadcastLogin(userId, accessToken);
  }

broadcastTokenRefreshed(accessToken);

return data as unknown as AuthControllerGoogleLoginResult;
}

export async function logout(): Promise<AuthControllerLogoutResult> {
try {
return await getAuth().authControllerLogout();
  } finally {

clearAuthState();
  }
}

export async function logoutAll(): Promise<AuthControllerLogoutAllResult> {
try {
return await getAuth().authControllerLogoutAll();
  } finally {

clearAuthState();
  }
}

export async function getSecurityDashboard(): Promise<AccountSecurityDto> {
const data = await getAuth().authControllerGetSecurityDashboard();
if (!data.data) {
throw ApiError.fromInput({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Security dashboard response missing data envelope",
    });
  }
return data.data;
}

export async function getActiveSessions(): Promise<SessionListResponseDto> {
const data: AuthControllerGetActiveSessionsResult =
await getAuth().authControllerGetActiveSessions();
if (!data.data) {
throw ApiError.fromInput({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Active sessions response missing data envelope",
    });
  }
return data.data;
}

export async function revokeOtherSessions(): Promise<SessionManagementResultDto> {
const data = await getAuth().authControllerRevokeOtherSessions();
return {
message: (data.data as { message?: string })?.message ?? "",
  };
}

export async function revokeSession(
sessionId: string,
): Promise<SessionManagementResultDto> {
const data = await getAuth().authControllerRevokeSession(sessionId);
return {
message: (data.data as { message?: string })?.message ?? "",
  };
}

export type RevokeCurrentSessionResult =
| { kind: "success"; message: string }
  | { kind: "error"; error: ApiError };

export async function revokeCurrentSession(
sessionId: string,
): Promise<RevokeCurrentSessionResult> {
try {
const data = await getAuth().authControllerRevokeSession(sessionId);
const message = (data.data as { message?: string })?.message ?? "";

clearVerificationFlags();
clearAuthToken();
clearAllAuthCache();
broadcastAuthEvent({ type: "LOGGED_OUT" });
return { kind: "success", message };
  } catch (error) {
const err =
error instanceof ApiError
? error
: ApiError.fromInput({
status: 0,
code: "GLOBAL_INTERNAL_ERROR",
message:
error instanceof Error
? error.message
: "Unknown error revoking current session",
          });
return { kind: "error", error: err };
  }
}

export async function verifyEmail(
dto: Parameters<ReturnType<typeof getAuth>["authControllerVerifyEmail"]>[0],
): Promise<AuthControllerVerifyEmailResult> {
return getAuth().authControllerVerifyEmail(dto);
}

export async function resendVerificationEmail(
dto: Parameters<
ReturnType<typeof getAuth>["authControllerResendVerificationEmail"]
  >[0],
): Promise<AuthControllerResendVerificationEmailResult> {
return getAuth().authControllerResendVerificationEmail(dto);
}

export async function forgotPassword(
dto: Parameters<
ReturnType<typeof getAuth>["authControllerForgotPassword"]
  >[0],
): Promise<AuthControllerForgotPasswordResult> {
return getAuth().authControllerForgotPassword(dto);
}

export async function resetPassword(
dto: Parameters<ReturnType<typeof getAuth>["authControllerResetPassword"]>[0],
): Promise<AuthControllerResetPasswordResult> {
return getAuth().authControllerResetPassword(dto);
}

export async function verifyPassword(
dto: VerifyPasswordDto,
): Promise<VerifyPasswordResponseDto> {
const data: AuthControllerVerifyPasswordResult =
await getAuth().authControllerVerifyPassword(dto);
if (!data.data) {
throw ApiError.fromInput({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Verify password response missing data envelope",
    });
  }
return data.data;
}

export async function changePassword(
dto: ChangePasswordDto,
): Promise<ChangePasswordResponseDto> {
const data: AuthControllerChangePasswordResult =
await getAuth().authControllerChangePassword(dto);
if (!data.data) {
throw ApiError.fromInput({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Change password response missing data envelope",
    });
  }
return data.data;
}

export async function revalidateAfterPasswordChange(): Promise<{
dashboard: AccountSecurityDto;
sessions: SessionListResponseDto;
}> {
const [dashboard, sessions] = await Promise.all([
getSecurityDashboard(),
getActiveSessions(),
  ]);
return { dashboard, sessions };
}

export {
mapGoogleLoginError,
type GoogleLoginErrorKind,
type GoogleLoginErrorResult,
} from "@/features/auth/errors/oauth-error-mapper";

export {
mapSessionError,
isAlreadyRevoked,
isCurrentRevoked,
isAuthTerminalSessionError,
isSessionErrorRetryable,
isSessionConflict,
type SessionErrorTarget,
type SessionErrorClassification,
type SessionErrorInput,
} from "@/features/auth/errors/session-error-mapper";

export {
AUTH_SESSION_NOT_FOUND,
AUTH_INVALID_TOKEN,
AUTH_RESOURCE_CONFLICT,
isSessionNotFoundError,
isSessionErrorCode,
isSessionRecoverableStatus,
type SessionErrorCode,
} from "@/features/auth/errors/session-error-codes";

export {
COPY_KEYS as SECURITY_COPY_KEYS,
resolveCopy as resolveSecurityCopy,
passwordAgeUnknownSnapshot,
sessionListEmptySnapshot,
lastPasswordChangeUnknownSnapshot,
} from "@/features/auth/copy/security-copy";

export {
mapPasswordError,
isInvalidCurrentPassword,
isPasswordReuse,
isPasswordValidation,
isAuthTerminalPasswordError,
isPasswordConflict,
isPasswordErrorRetryable,
type PasswordErrorClassification,
type PasswordErrorInput,
} from "@/features/auth/errors/password-error-mapper";

export {
AUTH_INVALID_CURRENT_PASSWORD,
AUTH_PASSWORD_REUSE,

GLOBAL_VALIDATION_FAILED,
isInvalidCurrentPasswordError,
isPasswordReuseError,
isPasswordErrorCode,
isPasswordRecoverableStatus,
type PasswordErrorCode,
} from "@/features/auth/errors/password-error-codes";

export {
COPY_KEYS as PASSWORD_COPY_KEYS,
resolveCopy as resolvePasswordCopy,
verifyInvalidCurrentSnapshot,
passwordTooWeakSnapshot,
passwordChangeSuccessSnapshot,
hasPasswordCopyKey,
} from "@/features/auth/copy/password-copy";

export async function deleteAccount(
dto: DeleteAccountDto,
): Promise<DeleteAccountResponseDto> {
const data: AuthControllerDeleteAccountResult =
await getAuth().authControllerDeleteAccount(dto);
if (!data.data) {
throw ApiError.fromInput({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Delete account response missing data envelope",
    });
  }
return data.data;
}

export { verifyPassword as verifyPasswordForDeletion };

export {
mapDeletionError,
isInvalidCurrentPasswordDeletion,
isDeletionConflict,
isDeletionNotFound,
isAuthTerminalDeletionError,
isDeletionValidation,
isDeletionUncertain,
type DeletionErrorClassification,
type DeletionErrorInput,
} from "@/features/auth/errors/deletion-error-mapper";

export {
AUTH_DELETION_FAILED,

USER_NOT_FOUND,
isInvalidCurrentPasswordError as isInvalidCurrentPasswordDeletionCode,
isDeletionFailedError,
isUserNotFoundError,
isDeletionErrorCode,
isDeletionRecoverableStatus,
type DeletionErrorCode,
} from "@/features/auth/errors/deletion-error-codes";

export {
COPY_KEYS as DELETION_COPY_KEYS,
resolveCopy as resolveDeletionCopy,
deletionConfirmTitleSnapshot,
deletionConsequenceSnapshot,
deletionUncertainSnapshot,
hasDeletionCopyKey,
} from "@/features/auth/copy/deletion-copy";

export {
runDeletionFinalization,
isDeletionFinalized,
resetDeletionFinalizationForTesting,
type DeletionFinalizationResult,
type DeletionCleanupStep,
} from "@/features/auth/lifecycle/deletion-finalization";

export { finalizeDeletedAccountAuthMarkers } from "@/features/auth/lifecycle/deletion-auth-markers";

export {
clearAllDeletionCaches,
type DeletionCacheCleanupReport,
} from "@/features/auth/lifecycle/deletion-cache-cleanup";

export {
AUTH_PERSISTENT_KEYS,
clearPersistedUserStore,
clearDeletionPersistedAccountState,
clearSensitiveDeletionFormValues,
type DeletionFormSetters,
} from "@/features/auth/lifecycle/deletion-persisted-state";

export {
revalidateAccountExists,
type DeletionAccountExistence,
type DeletionRevalidationResult,
type RevalidateAccountExistsDeps,
} from "@/features/auth/lifecycle/deletion-revalidation";

export {
buildDeletionReplaceHistory,
DELETION_PUBLIC_LANDING_PATH,
} from "@/features/auth/lifecycle/deletion-history";

export {
DeletionGuard,
useDeletionGuardActive,
type DeletionGuardProps,
} from "@/features/auth/guards/deletion-guard";

export {
initialDeletionState,
assertNeverExhaustiveDeletionState,
isTerminalDeletionState,
type DeletionState,
type DeletionIdleState,
type DeletionPendingState,
type DeletionUncertainState,
type DeletionCleanupState,
type DeletionCompletedState,
type DeletionStateError,
} from "@/features/auth/types/deletion-state";

export {
useDeleteAccount,
DELETION_INTENT_TOKEN,
type UseDeleteAccountDeps,
type UseDeleteAccountResult,
type UseDeleteAccountSubmitResult,
} from "@/features/auth/hooks/use-delete-account";

export { broadcastAccountDeleted } from "@/lib/api/core/broadcast-channel";

export {
isDeletionTerminal,
markDeletionTerminal,
clearDeletionTerminal,
_isDeletionTerminalForTesting,
} from "@/features/auth/lifecycle/deletion-terminal";

export { handleRemoteAccountDeleted } from "@/features/auth/lifecycle/deletion-cross-tab";
