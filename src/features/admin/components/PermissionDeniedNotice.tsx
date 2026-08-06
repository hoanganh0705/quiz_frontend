'use client';

/**
 * `features/admin/components/PermissionDeniedNotice.tsx`
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.C2.
 *
 * Static notice component for the non-admin admin-shell boundary.
 *
 * The notice is intentionally copy-only — it never leaks the actual
 * permission name, the role slug, or any server-side detail. The
 * variant prop covers the three non-leaking surfaces Phase 7 uses:
 *
 *   - `'route'`        — full admin route (boundary at the shell level).
 *   - `'control'`      — a single control inside an otherwise visible
 *                        surface (e.g. a button in a moderator queue).
 *   - `'self-action'`  — the target user is the viewer (destructive
 *                        buttons hide this branch via `useSelfActionGate`
 *                        — this variant covers programmatic checks).
 *
 * The copy is intentionally generic so a single component can be
 * safely shared across every admin surface. Per-surface customisation
 * (when truly needed) should be done at the surface level, not here.
 */

import { ShieldOff } from 'lucide-react';

import { EmptyState } from '@/components/ui/EmptyState';

export type PermissionDeniedVariant = 'route' | 'control' | 'self-action';

export interface PermissionDeniedNoticeProps {
  variant?: PermissionDeniedVariant;
  className?: string;
}

const COPY: Readonly<Record<PermissionDeniedVariant, { title: string; description: string }>> = Object.freeze({
  route: {
    title: 'Restricted to administrators',
    description: 'This page is restricted to administrators.',
  },
  control: {
    title: 'Action not available',
    description: 'This action is not available for your account.',
  },
  'self-action': {
    title: 'Action not available on your own account',
    description: 'You cannot perform this action on your own account.',
  },
});

export function PermissionDeniedNotice({
  variant = 'route',
  className,
}: PermissionDeniedNoticeProps) {
  const copy = COPY[variant];
  return (
    <EmptyState
      icon={ShieldOff}
      title={copy.title}
      description={copy.description}
      className={className}
      size="md"
    />
  );
}
