

import type {
AuthControllerChangePassword201,
AuthControllerCheckEmail200,
AuthControllerCheckEmailDeprecated200,
AuthControllerCheckEmailParams,
AuthControllerCheckUsername200,
AuthControllerCheckUsernameDeprecated200,
AuthControllerCheckUsernameParams,
AuthControllerDeleteAccount200,
AuthControllerForgotPassword200,
AuthControllerGetActiveSessions200,
AuthControllerGetCurrentUser200,
AuthControllerGetSecurityDashboard200,
AuthControllerGoogleLogin201,
AuthControllerLogin201,
AuthControllerLogout201,
AuthControllerLogoutAll200,
AuthControllerRefreshToken201,
AuthControllerRegister201,
AuthControllerResendVerificationEmail201,
AuthControllerResetPassword201,
AuthControllerRevokeOtherSessions200,
AuthControllerRevokeSession200,
AuthControllerVerifyEmail200,
AuthControllerVerifyPassword201,
ChangePasswordDto,
CheckEmailDto,
CheckUsernameDto,
DeleteAccountDto,
ForgotPasswordDto,
GoogleLoginDto,
LoginDto,
RegisterDto,
ResendVerificationDto,
ResetPasswordDto,
VerifyEmailDto,
VerifyPasswordDto
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getAuth = () => {

const authControllerRegister = (
registerDto: RegisterDto,
 ) => {
return orvalCustomInstance<AuthControllerRegister201>(
{url: `/api/v1/auth/register`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: registerDto
    },
      );
    }

const authControllerVerifyEmail = (
verifyEmailDto: VerifyEmailDto,
 ) => {
return orvalCustomInstance<AuthControllerVerifyEmail200>(
{url: `/api/v1/auth/verify-email`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: verifyEmailDto
    },
      );
    }

const authControllerResendVerificationEmail = (
resendVerificationDto: ResendVerificationDto,
 ) => {
return orvalCustomInstance<AuthControllerResendVerificationEmail201>(
{url: `/api/v1/auth/resend-verification-email`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: resendVerificationDto
    },
      );
    }

const authControllerLogin = (
loginDto: LoginDto,
 ) => {
return orvalCustomInstance<AuthControllerLogin201>(
{url: `/api/v1/auth/login`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: loginDto
    },
      );
    }

const authControllerGoogleLogin = (
googleLoginDto: GoogleLoginDto,
 ) => {
return orvalCustomInstance<AuthControllerGoogleLogin201>(
{url: `/api/v1/auth/oauth/google`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: googleLoginDto
    },
      );
    }

const authControllerRefreshToken = (

 ) => {
return orvalCustomInstance<AuthControllerRefreshToken201>(
{url: `/api/v1/auth/refresh-token`, method: 'POST'
    },
      );
    }

const authControllerLogout = (

 ) => {
return orvalCustomInstance<AuthControllerLogout201>(
{url: `/api/v1/auth/logout`, method: 'POST'
    },
      );
    }

const authControllerLogoutAll = (

 ) => {
return orvalCustomInstance<AuthControllerLogoutAll200>(
{url: `/api/v1/auth/logout-all`, method: 'POST'
    },
      );
    }

const authControllerGetActiveSessions = (

 ) => {
return orvalCustomInstance<AuthControllerGetActiveSessions200>(
{url: `/api/v1/auth/sessions`, method: 'GET'
    },
      );
    }

const authControllerRevokeOtherSessions = (

 ) => {
return orvalCustomInstance<AuthControllerRevokeOtherSessions200>(
{url: `/api/v1/auth/sessions/others`, method: 'DELETE'
    },
      );
    }

const authControllerRevokeSession = (
sessionId: string,
 ) => {
return orvalCustomInstance<AuthControllerRevokeSession200>(
{url: `/api/v1/auth/sessions/${sessionId}`, method: 'DELETE'
    },
      );
    }

const authControllerGetSecurityDashboard = (

 ) => {
return orvalCustomInstance<AuthControllerGetSecurityDashboard200>(
{url: `/api/v1/auth/security/dashboard`, method: 'GET'
    },
      );
    }

const authControllerForgotPassword = (
forgotPasswordDto: ForgotPasswordDto,
 ) => {
return orvalCustomInstance<AuthControllerForgotPassword200>(
{url: `/api/v1/auth/forgot-password`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: forgotPasswordDto
    },
      );
    }

const authControllerResetPassword = (
resetPasswordDto: ResetPasswordDto,
 ) => {
return orvalCustomInstance<AuthControllerResetPassword201>(
{url: `/api/v1/auth/reset-password`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: resetPasswordDto
    },
      );
    }

const authControllerChangePassword = (
changePasswordDto: ChangePasswordDto,
 ) => {
return orvalCustomInstance<AuthControllerChangePassword201>(
{url: `/api/v1/auth/change-password`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: changePasswordDto
    },
      );
    }

const authControllerGetCurrentUser = (

 ) => {
return orvalCustomInstance<AuthControllerGetCurrentUser200>(
{url: `/api/v1/auth/me`, method: 'GET'
    },
      );
    }

const authControllerCheckEmail = (
params: AuthControllerCheckEmailParams,
 ) => {
return orvalCustomInstance<AuthControllerCheckEmail200>(
{url: `/api/v1/auth/check-email`, method: 'GET',
params
    },
      );
    }

const authControllerCheckEmailDeprecated = (
checkEmailDto: CheckEmailDto,
 ) => {
return orvalCustomInstance<AuthControllerCheckEmailDeprecated200>(
{url: `/api/v1/auth/check-email`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: checkEmailDto
    },
      );
    }

const authControllerCheckUsername = (
params: AuthControllerCheckUsernameParams,
 ) => {
return orvalCustomInstance<AuthControllerCheckUsername200>(
{url: `/api/v1/auth/check-username`, method: 'GET',
params
    },
      );
    }

const authControllerCheckUsernameDeprecated = (
checkUsernameDto: CheckUsernameDto,
 ) => {
return orvalCustomInstance<AuthControllerCheckUsernameDeprecated200>(
{url: `/api/v1/auth/check-username`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: checkUsernameDto
    },
      );
    }

const authControllerVerifyPassword = (
verifyPasswordDto: VerifyPasswordDto,
 ) => {
return orvalCustomInstance<AuthControllerVerifyPassword201>(
{url: `/api/v1/auth/verify-password`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: verifyPasswordDto
    },
      );
    }

const authControllerDeleteAccount = (
deleteAccountDto: DeleteAccountDto,
 ) => {
return orvalCustomInstance<AuthControllerDeleteAccount200>(
{url: `/api/v1/auth/account`, method: 'DELETE',
headers: {'Content-Type': 'application/json', },
data: deleteAccountDto
    },
      );
    }
return {authControllerRegister,authControllerVerifyEmail,authControllerResendVerificationEmail,authControllerLogin,authControllerGoogleLogin,authControllerRefreshToken,authControllerLogout,authControllerLogoutAll,authControllerGetActiveSessions,authControllerRevokeOtherSessions,authControllerRevokeSession,authControllerGetSecurityDashboard,authControllerForgotPassword,authControllerResetPassword,authControllerChangePassword,authControllerGetCurrentUser,authControllerCheckEmail,authControllerCheckEmailDeprecated,authControllerCheckUsername,authControllerCheckUsernameDeprecated,authControllerVerifyPassword,authControllerDeleteAccount}};
export type AuthControllerRegisterResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerRegister']>>>
export type AuthControllerVerifyEmailResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerVerifyEmail']>>>
export type AuthControllerResendVerificationEmailResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerResendVerificationEmail']>>>
export type AuthControllerLoginResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerLogin']>>>
export type AuthControllerGoogleLoginResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerGoogleLogin']>>>
export type AuthControllerRefreshTokenResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerRefreshToken']>>>
export type AuthControllerLogoutResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerLogout']>>>
export type AuthControllerLogoutAllResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerLogoutAll']>>>
export type AuthControllerGetActiveSessionsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerGetActiveSessions']>>>
export type AuthControllerRevokeOtherSessionsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerRevokeOtherSessions']>>>
export type AuthControllerRevokeSessionResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerRevokeSession']>>>
export type AuthControllerGetSecurityDashboardResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerGetSecurityDashboard']>>>
export type AuthControllerForgotPasswordResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerForgotPassword']>>>
export type AuthControllerResetPasswordResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerResetPassword']>>>
export type AuthControllerChangePasswordResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerChangePassword']>>>
export type AuthControllerGetCurrentUserResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerGetCurrentUser']>>>
export type AuthControllerCheckEmailResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerCheckEmail']>>>
export type AuthControllerCheckEmailDeprecatedResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerCheckEmailDeprecated']>>>
export type AuthControllerCheckUsernameResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerCheckUsername']>>>
export type AuthControllerCheckUsernameDeprecatedResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerCheckUsernameDeprecated']>>>
export type AuthControllerVerifyPasswordResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerVerifyPassword']>>>
export type AuthControllerDeleteAccountResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getAuth>['authControllerDeleteAccount']>>>
