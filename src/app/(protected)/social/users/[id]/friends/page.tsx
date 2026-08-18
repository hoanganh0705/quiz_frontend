import { notFound } from "next/navigation";

import { SocialListRouteGate } from "@/features/social/components/SocialListRouteGate";
import { isUuid } from "@/features/social/utils/is-uuid";

interface FriendsRouteProps {
params: Promise<{ id: string }>;
}

export default async function FriendsRoute({
params,
}: FriendsRouteProps): Promise<React.ReactElement> {
const { id } = await params;
if (!isUuid(id)) {
notFound();
  }
return <SocialListRouteGate kind="friends" targetUserId={id} />;
}
