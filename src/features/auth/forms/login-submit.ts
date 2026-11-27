import {
  clearAuthToken,
  type ClearAuthTokenFn,
} from "@/features/auth/utils/auth-cookies";
import type { LoginFormValues } from "./schemas/login.schema";
import { toLoginDto } from "./schemas/login.schema";
import {
  mapLoginError,
  type LoginErrorKind,
} from "@/features/auth/errors/login-error-mapper";
import { login as authServiceLogin } from "@/features/auth/services/auth.service";

import type { LoginResponseDto } from "@/lib/api/generated/schemas/loginResponseDto";

export type LoginSubmitResult =
  | { kind: "success"; user: LoginResponseDto }
  | {
      kind: "error";
      errorKind: LoginErrorKind;
    };

export interface SubmitLoginDeps {
  login: (dto: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }) => Promise<LoginResponseDto>;

  clearAuthToken: ClearAuthTokenFn;
}

export const defaultSubmitLoginDeps: SubmitLoginDeps = {
  login: authServiceLogin,
  clearAuthToken,
};

export async function submitLogin(
  values: LoginFormValues,
  deps: SubmitLoginDeps = defaultSubmitLoginDeps,
): Promise<LoginSubmitResult> {
  deps.clearAuthToken();

  try {
    const result = await deps.login(toLoginDto(values));
    return { kind: "success", user: result };
  } catch (err: unknown) {
    const mapped = mapLoginError(err);
    return {
      kind: "error",
      errorKind: mapped.kind,
    };
  }
}
