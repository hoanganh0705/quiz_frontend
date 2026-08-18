import { notFound } from "next/navigation";

import { SocialListRouteGate } from "@/features/social/components/SocialListRouteGate";
import { isUuid } from "@/features/social/utils/is-uuid";

interface FollowersRouteProps {
params: Promise<{ id: string }>;
}

export default async function FollowersRoute({
params,
}: FollowersRouteProps): Promise<React.ReactElement> {
const { id } = await params;
if (!isUuid(id)) {
notFound();
  }
return <SocialListRouteGate kind="followers" targetUserId={id} />;
}
