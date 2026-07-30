'use client';

/**
 * `/signup` route — renders the new `RegistrationFormBody`, guarded
 * by an auth-aware redirect.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source tickets:
 *   - TKT-2.1.D3 + D4 — page-level wiring of error mapping and
 *     acknowledgement navigation.
 *   - TKT-2.1.E1 — auth-aware redirect.
 *
 * The page deliberately has no business logic. Schema (TKT-2.1.D1),
 * submit handler (TKT-2.1.D2), error mapping (TKT-2.1.B2), copy
 * (TKT-2.1.B3), and availability indicators (TKT-2.1.C1–C5) all
 * live in `features/auth/forms/`. The auth-aware redirect
 * (TKT-2.1.E1) lives in `features/auth/guards/`. This file's only
 * jobs are:
 *
 *   - mount the redirect guard above the form;
 *   - render the form.
 *
 * Anti-enumeration discipline: this page does NOT import `@/lib/api`,
 * `axios`, or `@/lib/api/generated/*`. All HTTP-shaped concerns are
 * routed through `auth.service`.
 */

import { RegistrationFormBody } from '@/features/auth/forms/registration-form-body';
import { RedirectIfAuthed } from '@/features/auth/guards/redirect-if-authed';

export default function SignupPage() {
  return (
    <>
      <RedirectIfAuthed />
      <RegistrationFormBody />
    </>
  );
}
