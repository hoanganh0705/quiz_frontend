

import type { MyBadgeItemDto } from './myBadgeItemDto';
import type { ListMyBadges200AllOfMeta } from './listMyBadges200AllOfMeta';

export type ListMyBadges200AllOf = {
data?: MyBadgeItemDto[];
meta?: ListMyBadges200AllOfMeta;
};
