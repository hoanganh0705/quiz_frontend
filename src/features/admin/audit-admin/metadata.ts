/**
 * `metadata.ts` — Audit log admin feature metadata.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.F1.
 *
 * ## What this module owns
 *
 * Single source of truth for the audit log admin surface's:
 *   - Route path (`/admin/audit`)
 *   - Display label
 *   - Required permission(s)
 *   - Required feature flag
 *   - Lucide icon
 *
 * Consumed by:
 *   - `useAdminNav` (TKT-7.11.F1) — for the sidebar nav entry
 *   - `AuditLogRouteHandoff` — for the breadcrumb label
 *
 * ## Adding a new audit log feature
 *
 * Update `AUDIT_LOG_METADATA` here, then reference it from the
 * nav catalogue (`useAdminNav`) and any breadcrumb renderers.
 */

import { ScrollText } from 'lucide-react';

import type { AdminPermission } from '../permissions';

// ─── Constants ──────────────────────────────────────────────────────────────

/** Stable route path for the audit log viewer. */
export const AUDIT_LOG_ROUTE_PATH = '/admin/audit' as const;

/** Feature flag that gates the audit log surface. */
export const AUDIT_LOG_FEATURE_FLAG = 'phase7_admin_audit' as const;

// ─── Metadata ──────────────────────────────────────────────────────────────

/**
 * Single-source-of-truth metadata for the audit log admin surface.
 *
 * Consumed by:
 *   - `useAdminNav` (TKT-7.11.F1) — for the sidebar nav entry
 *   - `AuditLogRouteHandoff` — for the breadcrumb label
 *   - The audit log page header — for the page title
 */
export const AUDIT_LOG_METADATA = {
  /** Stable route path. */
  routePath: AUDIT_LOG_ROUTE_PATH,
  /** Display label for the nav and page title. */
  label: 'Audit log',
  /** Lucide icon component. */
  icon: ScrollText,
  /** Description shown in nav tooltips / admin docs. */
  description:
    'Browse admin actions: who did what, when, and against which resource.',
  /** Required permission(s) to view the nav entry. */
  requiredPermissions: [
    'audit_log_read',
  ] as readonly AdminPermission[],
  /** Feature flag that gates the surface. */
  featureFlag: AUDIT_LOG_FEATURE_FLAG,
} as const;

export type AuditLogMetadata = typeof AUDIT_LOG_METADATA;