

import type { SocialFeedItemDto } from './socialFeedItemDto';
import type { SocialControllerGetFeed200AllOfMeta } from './socialControllerGetFeed200AllOfMeta';

export type SocialControllerGetFeed200AllOf = {
data?: SocialFeedItemDto[];
meta?: SocialControllerGetFeed200AllOfMeta;
};
