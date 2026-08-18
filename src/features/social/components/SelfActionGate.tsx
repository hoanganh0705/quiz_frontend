"use client";

import type { ReactNode } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

interface SelfActionGateProps {

targetUserId: string;

children: ReactNode;

fallback?: ReactNode;
}

const DEFAULT_FALLBACK: ReactNode = null;

export function SelfActionGate(props: SelfActionGateProps): ReactNode {
const { targetUserId, children, fallback = DEFAULT_FALLBACK } = props;
const auth = useAuthSession();
const viewerId = auth.currentUser?.userId ?? null;

if (viewerId !== null && targetUserId === viewerId) {
return fallback;
  }

return children;
}