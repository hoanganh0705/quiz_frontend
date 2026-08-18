

import { resetPassword as defaultResetPassword } from "@/features/auth/services/auth.service";

import {
mapResetPasswordError,
type ResetPasswordErrorKind,
} from "@/features/auth/errors/recovery-error-mapper";

export type ResetSubmitResult =
| { kind: "success"; nextRoute: "/login" }
  | {
kind: "error";
errorKind: ResetPasswordErrorKind;
    };

export const RESET_ACK_ROUTE = "/login" as const;

export interface SubmitResetPasswordDeps {

resetPassword: (dto: { token: string; newPassword: string }) => Promise<unknown>;

clearAuthToken: () => void;

broadcastLogout: () => void;
}

export const defaultSubmitResetPasswordDeps: SubmitResetPasswordDeps = {
resetPassword: defaultResetPassword,
clearAuthToken: () => {
    // Page-side hooks supply the real implementation; the unit
    // suite supplies stubs.
  },
broadcastLogout: () => {
    // Same as above — page-side hooks supply the real implementation.
  },
};

export async function submitResetPassword(
token: string,
newPassword: string,
deps: SubmitResetPasswordDeps = defaultSubmitResetPasswordDeps,
): Promise<ResetSubmitResult> {
try {
await deps.resetPassword({ token, newPassword });

deps.clearAuthToken();
deps.broadcastLogout();
return { kind: "success", nextRoute: RESET_ACK_ROUTE };
  } catch (err: unknown) {
const mapped = mapResetPasswordError(err);
return {
kind: "error",
errorKind: mapped.kind,
    };
  }
}