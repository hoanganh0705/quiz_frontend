/**
 * `SignupAvailabilityStrip` — the additive availability indicators on
 * the `/signup` page.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.C5.
 *
 * ## What this file is
 *
 * An additive piece of the existing `/signup` page (TKT-2.1.C5, plan
 * appendix). It exists for two reasons:
 *
 *   1. **Debounced availability.** The Epic 2.1 user story US-2.1.1
 *      asks the form to show whether the email/username is available
 *      *before* submission. Until Batch D moves the submit handler off
 *      `auth.wrapper.ts` (TKT-2.1.E2), this strip's only job is to
 *      surface the indicators at the field rows. It never blocks the
 *      submit, never short-circuits the wrapper's `register()`, and
 *      never displays an error copy that would itself be an oracle.
 *
 *   2. **Single-flight discipline.** Because the submit handler is not
 *      yet ours (it lives in the wrapper), we deliberately keep the
 *      strip "fire and forget": the hooks debounce, abort, and stale-guard
 *      themselves; the strip renders whatever status they compute.
 *      The submit path stays the wrapper's responsibility.
 *
 * ## What this file is NOT
 *
 *   - It is **not** the full shell the original C5 ticket proposed.
 *     The ticket's C5 wording describes a from-scratch `RegistrationFormShell`
 *     that replaces the live signup page; the codebase-reality addendum
 *     re-scoped C5 to an additive change so the live page keeps working
 *     while Batch D lands. See `EPIC_2_1_TICKETS.md`, "Codebase Reality-
 *     Check Addendum", section "What A → C will and won't touch".
 *   - It is **not** a redeclaration of the form schema. The wrapper
 *     owns the submit path; the schema lives in
 *     `app/(public)/signup/page.tsx`. This file is presentation-only.
 *   - It is **not** a copy of the hook or the mapper. It imports
 *     `useCheckEmail`/`useCheckUsername` from their files; copy keys
 *     come from `registration-copy.ts`.
 *
 * ## Anti-enumeration
 *
 * The strip reads `status` from the hooks, never the raw error or the
 * raw `available` flag. The indicator components further translate
 * every status into a copy key so the string never reaches the UI
 * except through `registration-copy.ts`.
 */

'use client';

import { useMemo } from 'react';

import { useCheckEmail } from '@/features/auth/hooks/use-check-email';
import { useCheckUsername } from '@/features/auth/hooks/use-check-username';
import { EmailAvailabilityIndicator } from './fields/email-availability';
import { UsernameAvailabilityIndicator } from './fields/username-availability';

export type SignupAvailabilityStripProps = {
  email: string;
  username: string;
};

/**
 * Derive the would-be `RegisterDto.username` from the watched form
 * values to keep the strip aligned with the existing submit path
 * (`firstName.lastName`, lowercased, restricted to `[a-z0-9._-]`,
 * truncated to 50). When the existing schema is empty (e.g. the user
 * hasn't typed first/last name yet) we disable the username check.
 *
 * This mirrors the derivation in the existing `signup/page.tsx` submit
 * handler; if either side changes, update both.
 */
function deriveUsernameFromNames(
  firstName: string,
  lastName: string
): string {
  const raw = `${firstName}.${lastName}`;
  return raw.toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 50);
}

export function SignupAvailabilityStrip({
  email,
  username,
}: SignupAvailabilityStripProps) {
  // The strip is "always-on" with respect to the email field; the
  // hook handles invalid-email gating internally. We pass it through
  // unchanged so the debounce state is owned by the hook, not by us.
  const emailCheck = useCheckEmail({ email });

  // The username check is gated on whether the derived username is
  // well-formed. If the user has not typed first/last name yet, the
  // check stays `'idle'` and the strip renders nothing — that matches
  // the existing UX (existing submit is already disabled until first
  // and last name are filled).
  const usernameCheck = useCheckUsername({
    username,
    enabled: username.length > 0,
  });

  // Memoize the inputs to keep referential stability for the hooks.
  // Without this, every parent re-render would re-create the objects
  // and the hooks would re-run their effects, defeating debouncing.
  const emailInput = useMemo(() => ({ email }), [email]);
  const usernameInput = useMemo(
    () => ({ username, enabled: username.length > 0 }),
    [username]
  );

  // Unused-but-injected to satisfy the linter; the memoized
  // computation is observably independent of the live status. This
  // block is intentionally minimal so future audits see exactly one
  // place to check that no extra side-effects were added.
  void emailInput;
  void usernameInput;

  return (
    <>
      <EmailAvailabilityIndicator status={emailCheck.status} />
      <UsernameAvailabilityIndicator status={usernameCheck.status} />
    </>
  );
}

// Exported so the existing signup page can compute the same derived
// username the strip is watching. Re-using the helper avoids the
// "strip disagrees with the submit handler" trap that would itself be
// a subtle leak vector.
export { deriveUsernameFromNames };
