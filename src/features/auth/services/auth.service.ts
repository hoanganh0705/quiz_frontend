import {
  ApiError,
  coerceToApiError,
  getAuth,
  unwrapEnvelope,
  type AccountSecurityDto,
  type AuthControllerCheckEmailParams,
  type AuthControllerCheckUsernameParams,
  type ChangePasswordDto,
  type ChangePasswordResponseDto,
  type DeleteAccountDto,
  type DeleteAccountResponseDto,
  type SessionListResponseDto,
  type SessionManagementResultDto,
  type VerifyPasswordDto,
  type VerifyPasswordResponseDto,
} from "@/lib/api";
import {
  broadcastAuthEvent,
  type LoggedInEvent,
} from "@/lib/api/core/broadcast-channel";
import { getQueryClient } from "@/providers/QueryProvider";

import {
  clearAuthToken,
  setAuthToken,
  setRememberMeActive,
} from "@/features/auth/utils/auth-cookies";
import { clearAuthState } from "@/features/auth/utils/clear-auth-state";
import { clearVerificationFlags } from "@/features/auth/utils/verification-flag";

import type {
  AuthControllerChangePasswordResult,
  AuthControllerCheckEmailResult,
  AuthControllerCheckUsernameResult,
  AuthControllerDeleteAccountResult,
  AuthControllerForgotPasswordResult,
  AuthControllerGetActiveSessionsResult,
  AuthControllerLogoutAllResult,
  AuthControllerLogoutResult,
  AuthControllerRegisterResult,
  AuthControllerResendVerificationEmailResult,
  AuthControllerResetPasswordResult,
  AuthControllerVerifyEmailResult,
  AuthControllerVerifyPasswordResult,
} from "@/lib/api/generated/auth/auth";
import type { LoginResponseDto } from "@/lib/api/generated/schemas/loginResponseDto";

function readEnvelopeMessage(wire: { data?: { message?: string } } | null | undefined): string {
  return wire?.data?.message ?? "";
}

function broadcastLogin(userId: string, accessToken: string): void {
  const event: Omit<LoggedInEvent, "tabId" | "timestamp"> = {
    type: "LOGGED_IN",
    userId,
    accessToken,
  };
  broadcastAuthEvent(event);
}

function broadcastTokenRefreshed(accessToken: string): void {
  broadcastAuthEvent({
    type: "TOKEN_REFRESHED",
    accessToken,
  });
}

export function broadcastAuth(
  event: Parameters<typeof broadcastAuthEvent>[0],
): void {
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

const VIEWER_QUERY_KEY_PREFIXES = [
  ["auth"],
  ["users", "me"],
  ["bookmarks"],
  ["follow-lookup"],
  ["attempts"],
  ["daily-challenge"],
  ["reviews"],
] as const;

function invalidateViewerQueries(): void {
  if (typeof window === "undefined") return;
  try {
    const queryClient = getQueryClient();
    for (const queryKey of VIEWER_QUERY_KEY_PREFIXES) {
      void queryClient.invalidateQueries({ queryKey });
    }
  } catch {
    // Fail-open when QueryClient is unavailable
  }
}

export async function login(
  dto: Parameters<ReturnType<typeof getAuth>["authControllerLogin"]>[0] & {
    rememberMe?: boolean;
  },
): Promise<LoginResponseDto> {
  const rememberMe = Boolean(dto?.rememberMe);
  setRememberMeActive(rememberMe);

  const wire = await getAuth().authControllerLogin(dto);
  const data = unwrapEnvelope<LoginResponseDto>(
    wire as { data?: LoginResponseDto },
    "Login response missing data envelope",
  );
  const accessToken = data.accessToken;

  setAuthToken(accessToken, {
    sessionOnly: !rememberMe,
    days: rememberMe ? 30 : undefined,
  });

  const userId = data.userId ?? "";

  if (userId) {
    broadcastLogin(userId, accessToken);
  } else {
    broadcastTokenRefreshed(accessToken);
  }

  invalidateViewerQueries();

  return data;
}

export async function googleLogin(idToken: string): Promise<LoginResponseDto> {
  const wire = await getAuth().authControllerGoogleLogin({
    idToken,
  });
  const data = unwrapEnvelope<LoginResponseDto>(
    wire as { data?: LoginResponseDto },
    "Google login response missing data envelope",
  );
  const accessToken = data.accessToken;

  setAuthToken(accessToken);

  const userId = data.userId ?? "";

  if (userId) {
    broadcastLogin(userId, accessToken);
  } else {
    broadcastTokenRefreshed(accessToken);
  }

  invalidateViewerQueries();

  return data;
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
  const wire = await getAuth().authControllerGetSecurityDashboard();
  return unwrapEnvelope(
    wire,
    "Security dashboard response missing data envelope",
  );
}

export async function getActiveSessions(): Promise<SessionListResponseDto> {
  const wire: AuthControllerGetActiveSessionsResult =
    await getAuth().authControllerGetActiveSessions();
  return unwrapEnvelope(
    wire,
    "Active sessions response missing data envelope",
  );
}

export async function revokeOtherSessions(): Promise<SessionManagementResultDto> {
  const wire = await getAuth().authControllerRevokeOtherSessions();
  return {
    message: readEnvelopeMessage(wire as { data?: { message?: string } }),
  };
}

export async function revokeSession(
  sessionId: string,
): Promise<SessionManagementResultDto> {
  const wire = await getAuth().authControllerRevokeSession(sessionId);
  return {
    message: readEnvelopeMessage(wire as { data?: { message?: string } }),
  };
}

export type RevokeCurrentSessionResult =
  | { kind: "success"; message: string }
  | { kind: "error"; error: ApiError };

export async function revokeCurrentSession(
  sessionId: string,
): Promise<RevokeCurrentSessionResult> {
  try {
    const wire = await getAuth().authControllerRevokeSession(sessionId);
    const message = readEnvelopeMessage(
      wire as { data?: { message?: string } },
    );

    clearVerificationFlags();
    clearAuthToken();
    broadcastAuthEvent({ type: "LOGGED_OUT" });
    return { kind: "success", message };
  } catch (error) {
    return { kind: "error", error: coerceToApiError(error) };
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
  const wire: AuthControllerVerifyPasswordResult =
    await getAuth().authControllerVerifyPassword(dto);
  return unwrapEnvelope(
    wire,
    "Verify password response missing data envelope",
  );
}

export async function changePassword(
  dto: ChangePasswordDto,
): Promise<ChangePasswordResponseDto> {
  const wire: AuthControllerChangePasswordResult =
    await getAuth().authControllerChangePassword(dto);
  return unwrapEnvelope(
    wire,
    "Change password response missing data envelope",
  );
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

export async function deleteAccount(
  dto: DeleteAccountDto,
): Promise<DeleteAccountResponseDto> {
  const wire: AuthControllerDeleteAccountResult =
    await getAuth().authControllerDeleteAccount(dto);
  return unwrapEnvelope(
    wire,
    "Delete account response missing data envelope",
  );
}
