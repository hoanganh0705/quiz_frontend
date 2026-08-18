import { notFound } from "next/navigation";

import { MutualsRouteGate } from "@/features/social/components/MutualsRouteGate";
import { isUuid } from "@/features/social/utils/is-uuid";

interface MutualFollowersRouteProps {
params: Promise<{ id: string }>;
}

export default async function MutualFollowersRoute({
params,
}: MutualFollowersRouteProps): Promise<React.ReactElement> {
const { id } = await params;
if (!isUuid(id)) {
notFound();
  }
return <MutualsRouteGate kind="followers" targetUserId={id} />;
}