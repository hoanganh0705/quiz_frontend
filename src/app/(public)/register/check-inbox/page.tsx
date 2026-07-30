'use client';

/**
 * `/register/check-inbox` — the post-submit acknowledgement page.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.D4.
 *
 * ## Why this page exists
 *
 * The acknowledgement body is the single most security-sensitive
 * surface in the registration flow. If the body for a brand-new
 * email differs from the body for an already-registered email, an
 * attacker can enumerate which addresses have accounts on this
 * platform. The backend's `POST /auth/register` already returns a
 * 201 with a generic message in both cases; the frontend's job is
 * to render that same body without conditional branching on the
 * submitted email.
 *
 * This file's markup, copy, and `data-testid`s are intentionally
 * deterministic. The F2 anti-enumeration test
 * (`e2e/auth/register-anti-enumeration.spec.ts`) takes two DOM
 * snapshots:
 *
 *   - one after submitting a brand-new email;
 *   - one after submitting a known-existing email;
 *
 * and asserts they are byte-identical. Any conditional render —
 * e.g. "Welcome back!" for an existing user — would fail the
 * snapshot. **Do not** add branchy copy here.
 *
 * ## Links
 *
 * - "Resend verification" → `/resend-verification` (Epic 2.2 owns
 *   this route; today it lives at
 *   `app/(public)/resend-verification/page.tsx`).
 * - "Sign in" → `/login` (Epic 1.2 territory, already shipped).
 *
 * The acknowledgement page is reachable regardless of auth state
 * (TKT-2.1.E1): a logged-in user who just registered is still
 * valid; a logged-out user should see the inbox message.
 */

import Link from 'next/link';

import {
  COPY_KEYS,
  resolveCopy,
} from '@/features/auth/copy/registration-copy';

export default function CheckInboxPage() {
  return (
    <main
      className='min-h-screen flex items-center justify-center bg-background px-6 py-12'
      data-testid='check-inbox-page'
    >
      <div className='w-full max-w-md space-y-6 text-center'>
        <h1 className='text-3xl font-bold text-foreground'>
          {resolveCopy(COPY_KEYS.submit.acknowledgement.title)}
        </h1>
        <p
          className='text-sm text-muted-foreground'
          data-testid='acknowledgement-body'
        >
          {resolveCopy(COPY_KEYS.submit.acknowledgement.body)}
        </p>
        <p className='text-sm text-muted-foreground'>
          {resolveCopy(COPY_KEYS.submit.acknowledgement.action)}
        </p>
        <div className='flex flex-col gap-2 pt-4'>
          <Link
            href='/resend-verification'
            className='text-sm font-medium underline text-foreground hover:text-muted-foreground'
            data-testid='resend-link'
          >
            {resolveCopy(COPY_KEYS.submit.acknowledgement.resendLabel)}
          </Link>
          <Link
            href='/login'
            className='text-sm font-medium underline text-foreground hover:text-muted-foreground'
            data-testid='login-link'
          >
            {resolveCopy(COPY_KEYS.submit.acknowledgement.loginLabel)}
          </Link>
        </div>
      </div>
    </main>
  );
}
