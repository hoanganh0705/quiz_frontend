

import type { NotificationAnalyticsDtoByType } from './notificationAnalyticsDtoByType';
import type { NotificationAnalyticsDtoByChannel } from './notificationAnalyticsDtoByChannel';

export interface NotificationAnalyticsDto {

total: number;

unread: number;

byType: NotificationAnalyticsDtoByType;

byChannel: NotificationAnalyticsDtoByChannel;

last24h: number;

last7d: number;
}
