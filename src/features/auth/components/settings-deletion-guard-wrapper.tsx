'use client';

/**
 * Client wrapper for the settings layout that applies the
 * deletion-terminal guard.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T21.
 *
 * ## Why a wrapper
 *
 * The settings layout (`app/(protected)/settings/layout.tsx`) is a
 * server component (it calls `buildMetadata`). The
 * `DeletionGuard` hook (`useDeletionGuardActive`) is client-only.
 * This wrapper is the client island that bridges the two.
 *
 * The wrapper itself does NOT render anything visible — it just
 * guards its children.
 */

import type { ReactNode } from 'react';
import { DeletionGuard } from '@/features/auth/guards/deletion-guard';

export function SettingsDeletionGuardWrapper({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <DeletionGuard>{children}</DeletionGuard>;
}
