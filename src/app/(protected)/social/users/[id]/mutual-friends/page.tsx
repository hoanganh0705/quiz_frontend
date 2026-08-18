import { notFound } from "next/navigation";

import { MutualsRouteGate } from "@/features/social/components/MutualsRouteGate";
import { isUuid } from "@/features/social/utils/is-uuid";

interface MutualFriendsRouteProps {
params: Promise<{ id: string }>;
}

export default async function MutualFriendsRoute({
params,
}: MutualFriendsRouteProps): Promise<React.ReactElement> {
const { id } = await params;
if (!isUuid(id)) {
notFound();
  }
return <MutualsRouteGate kind="friends" targetUserId={id} />;
}