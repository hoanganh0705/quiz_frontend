

import type { NotificationResponseDto } from './notificationResponseDto';
import type { GetNotifications200AllOfMeta } from './getNotifications200AllOfMeta';

export type GetNotifications200AllOf = {
data?: NotificationResponseDto[];
meta?: GetNotifications200AllOfMeta;
};
