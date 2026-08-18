

import type {
MyBadgeItemDto,
ListMyBadges200,
ListMyBadges200AllOf,
} from "@/lib/api/generated/schemas";

export type { MyBadgeItemDto };

export type UserBadge = MyBadgeItemDto & { id: string };

export type EarnedUserBadge = UserBadge;

export interface UserBadgeList {
items: EarnedUserBadge[];
total: number;
}

export type ListMyBadgesResponse = ListMyBadges200 &
ListMyBadges200AllOf & {
data?: MyBadgeItemDto[];
  };

export function myBadgesKey(): readonly ["users", "me", "badges"] {
return ["users", "me", "badges"];
}

export function filterEarnedBadges(badges: MyBadgeItemDto[]): EarnedUserBadge[] {
return badges.map((badge) => ({
...badge,
id: badge.badgeId,
  }));
}
