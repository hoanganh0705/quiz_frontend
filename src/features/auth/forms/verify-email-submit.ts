

import { verifyEmail as defaultVerifyEmail } from "@/features/auth/services/auth.service";

import {
mapVerifyEmailError,
type VerifyEmailErrorKind,
} from "@/features/auth/errors/verify-email-error-mapper";

export type VerifySubmitResult =
| { kind: "done" }
  | {
kind: "error";
errorKind: VerifyEmailErrorKind;
    };

export const VERIFY_ACK_IN_PLACE = null;

export interface SubmitVerifyEmailDeps {

verifyEmail: (dto: { token: string }) => Promise<unknown>;
}

export const defaultSubmitVerifyEmailDeps: SubmitVerifyEmailDeps = {
verifyEmail: defaultVerifyEmail,
};

export async function submitVerifyEmail(
token: string,
deps: SubmitVerifyEmailDeps = defaultSubmitVerifyEmailDeps,
): Promise<VerifySubmitResult> {
try {
await deps.verifyEmail({ token });
return { kind: "done" };
  } catch (err: unknown) {
const mapped = mapVerifyEmailError(err);
return {
kind: "error",
errorKind: mapped.kind,
    };
  }
}

export const TOKEN_MIN_LEN = 32;
export const TOKEN_MAX_LEN = 512;

export function isWellFormedVerifyToken(token: string): boolean {
if (typeof token !== "string") return false;
const trimmed = token.trim();
if (trimmed.length === 0) return false;
if (trimmed.length < TOKEN_MIN_LEN) return false;
if (trimmed.length > TOKEN_MAX_LEN) return false;
return true;
}
