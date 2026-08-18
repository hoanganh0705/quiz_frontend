'use client';

import { getFeatureFlagValue } from '@/lib/feature-flags';

export type AdminFeatureFlag =
| 'admin_live'
  | 'admin_review_moderation_live'
  | 'admin_comment_moderation_live'
  | 'admin_tag_live'
  | 'admin_category_live'
  | 'admin_ranking_live'
  | 'admin_achievement_live'
  | 'admin_tournament_live'
  | 'admin_user_role_live'
  | 'admin_audit_live';

export interface UseAdminFeatureFlag {
flag: AdminFeatureFlag;
value: 'live' | 'placeholder';
isLive: boolean;
isPlaceholder: boolean;
}

export function useAdminFeatureFlag(flag: AdminFeatureFlag): UseAdminFeatureFlag {
const value = getFeatureFlagValue(flag);
const narrowed: 'live' | 'placeholder' =
value === 'live' ? 'live' : 'placeholder';
const isLive = narrowed === 'live';
const isPlaceholder = narrowed === 'placeholder';
return { flag, value: narrowed, isLive, isPlaceholder };
}
