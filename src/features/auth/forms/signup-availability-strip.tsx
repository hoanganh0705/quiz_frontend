"use client";

import { useCallback } from "react";

import {
  isWellFormedEmail,
  isWellFormedUsername,
  useAvailabilityCheck,
} from "@/features/auth/hooks/use-availability-check";
import { checkEmail, checkUsername } from "@/features/auth/services/auth.service";

import { AvailabilityIndicator } from "./fields/availability-indicator";

export type SignupAvailabilityStripProps = {
  email: string;
  username: string;
};

function deriveUsernameFromNames(firstName: string, lastName: string): string {
  const raw = `${firstName}.${lastName}`;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 50);
}

export function SignupAvailabilityStrip({
  email,
  username,
}: SignupAvailabilityStripProps) {
  const checkEmailAvailable = useCallback(async (val: string) => {
    const result = await checkEmail({ email: val });
    return Boolean(result.data?.available);
  }, []);

  const checkUsernameAvailable = useCallback(async (val: string) => {
    const result = await checkUsername({ username: val });
    return Boolean(result.data?.available);
  }, []);

  const emailCheck = useAvailabilityCheck({
    value: email,
    isValid: isWellFormedEmail,
    check: checkEmailAvailable,
  });

  const usernameCheck = useAvailabilityCheck({
    value: username,
    isValid: isWellFormedUsername,
    check: checkUsernameAvailable,
    enabled: username.length > 0,
  });

  return (
    <>
      <AvailabilityIndicator status={emailCheck.status} />
      <AvailabilityIndicator status={usernameCheck.status} />
    </>
  );
}

export { deriveUsernameFromNames };
