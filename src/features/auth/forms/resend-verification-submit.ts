

import { resendVerificationEmail as defaultResend } from "@/features/auth/services/auth.service";

import {
mapResendVerificationError,
type ResendVerificationErrorKind,
} from "@/features/auth/errors/verify-email-error-mapper";

import type { ResendVerificationFormValues } from "./schemas/resend-verification.schema";
import { toResendVerificationDto } from "./schemas/resend-verification.schema";

export type ResendSubmitResult =
| { kind: "cooldown"; cooldownMs: number }
  | {
kind: "error";
errorKind: ResendVerificationErrorKind;
    };

export const RESEND_COOLDOWN_MS = 60_000;

export const RESEND_ACK_IN_PLACE = null;

export interface SubmitResendVerificationDeps {

resendVerificationEmail: (dto: { email: string }) => Promise<unknown>;

cooldownMs?: number;
}

export const defaultSubmitResendDeps: SubmitResendVerificationDeps = {
resendVerificationEmail: defaultResend,
cooldownMs: RESEND_COOLDOWN_MS,
};

export async function submitResendVerification(
values: ResendVerificationFormValues,
deps: SubmitResendVerificationDeps = defaultSubmitResendDeps,
): Promise<ResendSubmitResult> {
const cooldownMs = deps.cooldownMs ?? RESEND_COOLDOWN_MS;
try {
await deps.resendVerificationEmail(toResendVerificationDto(values));
return { kind: "cooldown", cooldownMs };
  } catch (err: unknown) {
const mapped = mapResendVerificationError(err);
return {
kind: "error",
errorKind: mapped.kind,
    };
  }
}
