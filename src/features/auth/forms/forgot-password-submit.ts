

import { forgotPassword as defaultForgotPassword } from "@/features/auth/services/auth.service";

import {
mapForgotPasswordError,
type ForgotPasswordErrorKind,
} from "@/features/auth/errors/recovery-error-mapper";

import {
FORGOT_PASSWORD_COOLDOWN_MS,
} from "./recovery-cooldown";

export type ForgotSubmitResult =
| { kind: "cooldown"; cooldownMs: typeof FORGOT_PASSWORD_COOLDOWN_MS }
  | {
kind: "error";
errorKind: ForgotPasswordErrorKind;
    };

export const FORGOT_ACK_IN_PLACE = null;

export interface SubmitForgotPasswordDeps {

forgotPassword: (dto: { email: string }) => Promise<unknown>;

cooldownMs?: number;
}

export const defaultSubmitForgotPasswordDeps: SubmitForgotPasswordDeps = {
forgotPassword: defaultForgotPassword,
};

export async function submitForgotPassword(
email: string,
deps: SubmitForgotPasswordDeps = defaultSubmitForgotPasswordDeps,
): Promise<ForgotSubmitResult> {
const cooldownMs = (deps.cooldownMs ?? FORGOT_PASSWORD_COOLDOWN_MS) as typeof FORGOT_PASSWORD_COOLDOWN_MS;
try {
await deps.forgotPassword({ email });
return { kind: "cooldown", cooldownMs };
  } catch (err: unknown) {
const mapped = mapForgotPasswordError(err);
return {
kind: "error",
errorKind: mapped.kind,
    };
  }
}