/**
 * `app/(protected)/layout.tsx` — root layout for the protected route group.
 *
 * Source epic: Folder-convention refactor (move admin/social/instances/
 *   notifications/tournaments into app/(protected)/).
 *
 * ## What this layout does
 *
 * 1. Wraps every page under `(protected)/**` in `<ProtectedShell>`, which
 *    performs a client-side defense-in-depth auth check (the server-side
 *    gate lives in `src/proxy.ts`).
 * 2. Establishes a consistent DOM contract for E2E tests and assistive
 *    tech (`data-protected-route="true"`, `role="region"`,
 *    `aria-label="Authenticated content"`).
 *
 * ## Why a server component here
 *
 * The layout itself is a server component (no `"use client"`) so the
 * children are still server-rendered where possible. Only the inner
 * `<ProtectedShell>` is a client component, which keeps the bundle
 * footprint minimal.
 *
 * ## Inventory
 *
 * As of this commit the following sub-trees live under `(protected)/`:
 *
 *   - admin/                — admin console (admin role enforced server-side).
 *   - bookmarks/            — saved quizzes.
 *   - create-quiz/          — quiz authoring UI.
 *   - friends/              — social graph (friend requests, blocks).
 *   - instances/            — live quiz sessions (join, play, close).
 *   - my-profile/           — current user's profile.
 *   - my-quizzes/           — user's quiz dashboard and version history.
 *   - notifications/        — notification center + preferences.
 *   - onboarding/           — first-run UX.
 *   - quiz-history/         — attempt history.
 *   - quizzes/[idOrSlug]/attempt — quiz-attempt runtime.
 *   - settings/             — account preferences.
 *   - social/               — read-only social-graph lists.
 *   - tournament/           — singular tournament landing.
 *   - tournaments/          — plural tournament listings + detail pages.
 *
 * The URL-prefix list in `proxy.ts` (`PROTECTED_PREFIXES`,
 * `ADMIN_PREFIXES`) is the source of truth for what gets gated; the
 * `(protected)/` folder is the source of truth for *where* the protected
 * routes live in source.
 *
 * @see src/proxy.ts — the server-side gate.
 * @see ./\_components/ProtectedShell.tsx — the client-side belt-and-braces.
 */
import type { ReactNode } from 'react';
import { ProtectedShell } from './_components/ProtectedShell';

export default function ProtectedLayout({
  children
}: {
  children: ReactNode
}) {
  return <ProtectedShell>{children}</ProtectedShell>;
}