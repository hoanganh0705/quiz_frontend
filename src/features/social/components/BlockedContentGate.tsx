"use client";

import type { ReactNode } from "react";

import { useRelationship } from "@/features/social/hooks/useRelationship";

import type { Relationship } from "@/features/social/types";

interface BlockedContentGateProps {

targetUserId: string;

children: ReactNode;

fallback?: ReactNode;

relationshipOverride?: Relationship | null;
}

const BLOCKING_RELATIONSHIPS = new Set<Relationship>(["blocked", "blocked_by"]);

const DEFAULT_FALLBACK: ReactNode = (
<div
data-testid="blocked-content-gate-fallback"
aria-label="This content is hidden"
className="flex flex-col gap-1 p-4 text-sm text-muted-foreground"
  >
<p className="font-medium">This content is hidden</p>
<p>
You cannot view this content because of a block between you and this
      user.
    </p>
</div>
);

export function BlockedContentGate(props: BlockedContentGateProps): ReactNode {
const { targetUserId, children, fallback, relationshipOverride } = props;
const live = useRelationship(targetUserId);

const relationship: Relationship | null | undefined =
relationshipOverride !== undefined
? relationshipOverride
: live.relationship;

const isBlocked =
relationship !== null &&
relationship !== undefined &&
BLOCKING_RELATIONSHIPS.has(relationship);

if (isBlocked) {
return fallback ?? DEFAULT_FALLBACK;
  }

return children;
}