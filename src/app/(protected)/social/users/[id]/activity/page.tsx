import { notFound } from "next/navigation";

import { ActivityRouteGate } from "@/features/social/components/ActivityRouteGate";
import { isUuid } from "@/features/social/utils/is-uuid";

interface ActivityRouteProps {
params: Promise<{ id: string }>;
}

export default async function UserActivityRoute({
params,
}: ActivityRouteProps): Promise<React.ReactElement> {
const { id } = await params;
if (!isUuid(id)) {
notFound();
  }
return <ActivityRouteGate targetUserId={id} />;
}