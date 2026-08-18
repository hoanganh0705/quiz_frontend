'use client';

import { AchievementAdminUserRouteHandoff } from './_components/AchievementAdminUserRouteHandoff';

export default function AdminAchievementUserPage({
params,
}: {
params: { userId: string };
}) {
return <AchievementAdminUserRouteHandoff userId={params.userId} />;
}
