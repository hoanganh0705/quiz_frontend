

import { register as defaultRegister } from "@/features/auth/services/auth.service";

import type { RegisterFormValues } from "./schemas/register.schema";
import { toRegisterDto } from "./schemas/register.schema";
import {
mapRegisterError,
RegisterFieldErrors,
type RegisterErrorKind,
} from "@/features/auth/errors/register-error-mapper";

export type RegistrationSubmitResult =
| { kind: "ok"; nextRoute: string }
  | {
kind: "error";
errorKind: RegisterErrorKind;
fieldErrors?: RegisterFieldErrors;
globalMessage?: string;
    };

export const ACKNOWLEDGE_ROUTE = "/register/check-inbox";

export interface SubmitRegistrationDeps {

register: (dto: {
username: string;
email: string;
password: string;
  }) => Promise<unknown>;

ackRoute?: string;
}

export const defaultSubmitDeps: SubmitRegistrationDeps = {
register: defaultRegister,
ackRoute: ACKNOWLEDGE_ROUTE,
};

export async function submitRegistration(
values: RegisterFormValues,
deps: SubmitRegistrationDeps = defaultSubmitDeps,
): Promise<RegistrationSubmitResult> {
const ackRoute = deps.ackRoute ?? ACKNOWLEDGE_ROUTE;
try {
await deps.register(toRegisterDto(values));
return { kind: "ok", nextRoute: ackRoute };
  } catch (err: unknown) {
const mapped = mapRegisterError(err);
return {
kind: "error",
errorKind: mapped.kind,
fieldErrors: mapped.fieldErrors,
globalMessage: mapped.globalMessage,
    };
  }
}
