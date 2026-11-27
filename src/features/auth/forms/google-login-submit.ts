import {
  clearAuthToken,
  type ClearAuthTokenFn,
} from "@/features/auth/utils/auth-cookies";
import {
  mapGoogleLoginError,
  type GoogleLoginErrorKind,
} from "@/features/auth/errors/oauth-error-mapper";
import { googleLogin as authServiceGoogleLogin } from "@/features/auth/services/auth.service";

import type { LoginResponseDto } from "@/lib/api/generated/schemas/loginResponseDto";

export type GoogleLoginSubmitResult =
  | { kind: "success"; user: LoginResponseDto }
  | {
      kind: "error";
      errorKind: GoogleLoginErrorKind;
    };

export interface GoogleLoginSubmitDeps {
  googleLogin: (idToken: string) => Promise<LoginResponseDto>;

  clearAuthToken: ClearAuthTokenFn;
}

export const defaultGoogleLoginSubmitDeps: GoogleLoginSubmitDeps = {
  googleLogin: authServiceGoogleLogin,
  clearAuthToken,
};

export async function googleLoginSubmit(
  idToken: string,
  deps: GoogleLoginSubmitDeps = defaultGoogleLoginSubmitDeps,
): Promise<GoogleLoginSubmitResult> {
  try {
    const result = await deps.googleLogin(idToken);
    return { kind: "success", user: result };
  } catch (err: unknown) {
    const mapped = mapGoogleLoginError(err);
    return {
      kind: "error",
      errorKind: mapped.kind,
    };
  }
}
