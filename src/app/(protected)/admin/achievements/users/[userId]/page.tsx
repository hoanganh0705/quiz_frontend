'use client';

import * as React from 'react';
import { AchievementAdminUserRouteHandoff } from './_components/AchievementAdminUserRouteHandoff';

export default function AdminAchievementUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = React.use(params);
  return <AchievementAdminUserRouteHandoff userId={userId} />;
}
