

"use client";

import { useEffect } from "react";

const ACTIVE_TARGET_USER_IDS_KEY = Symbol.for(
"phase6_6_10_activeTargetUserIds",
);

interface ActiveTargetUserIdsGlobal {
set: Set<string>;
}

const globalRef = globalThis as typeof globalThis & {
[ACTIVE_TARGET_USER_IDS_KEY]?: ActiveTargetUserIdsGlobal;
};

function getActiveSet(): Set<string> {
if (globalRef[ACTIVE_TARGET_USER_IDS_KEY] === undefined) {
globalRef[ACTIVE_TARGET_USER_IDS_KEY] = {
set: new Set<string>(),
    };
  }
return globalRef[ACTIVE_TARGET_USER_IDS_KEY]!.set;
}

export function getActiveTargetUserIds(): readonly string[] {
if (typeof window === "undefined") return [];
return Array.from(getActiveSet());
}

export function __resetActiveTargetUserIdsForTests(): void {
if (globalRef[ACTIVE_TARGET_USER_IDS_KEY] !== undefined) {
globalRef[ACTIVE_TARGET_USER_IDS_KEY]!.set.clear();
  }
}

export function useActiveTargetUserIds(
targetUserId: string | null | undefined,
): void {
useEffect(() => {
if (typeof window === "undefined") return;
if (targetUserId === null || targetUserId === undefined) return;
if (targetUserId.length === 0) return;

const set = getActiveSet();
set.add(targetUserId);

return () => {
set.delete(targetUserId);
    };
  }, [targetUserId]);
}