/**
 * `features/admin/hooks/index.ts` — admin-feature hooks barrel.
 *
 * Re-exports the canonical list of admin hooks added by Epic 7.1.
 * Consumers should import from this barrel:
 *
 *   import { usePermission, useAdminFeatureFlag } from '@/features/admin/hooks';
 *
 * Exports are kept alphabetical for visual consistency. The barrel
 * contains no runtime logic.
 */

export { useAdminFeatureFlag } from './useAdminFeatureFlag';
export type { UseAdminFeatureFlag, AdminFeatureFlag } from './useAdminFeatureFlag';

export { useAdminIdentity } from './useAdminIdentity';
export type { UseAdminIdentityResult } from './useAdminIdentity';

export { useAdminRequestId, useAdminRequestIdStore } from './useAdminRequestId';
export type {
  AdminRequestIdEntry,
  AdminRequestIdStore,
  UseAdminRequestIdResult,
} from './useAdminRequestId';

export { useAdminRole } from './useAdminRole';
export type { AdminRoleDocument } from './useAdminRole';

export { usePermission } from './usePermission';
export type { UsePermission } from './usePermission';

export { useSelfActionGate } from './useSelfActionGate';
export type { UseSelfActionGate } from './useSelfActionGate';

export { useTypedConfirm } from './useTypedConfirm';
export type { UseTypedConfirm } from './useTypedConfirm';
