"use client";

import * as React from "react";

import { isSearchSurfaceEnabled } from "@/features/search/flags";

export interface SearchGuardProps {

children: React.ReactNode;

fallback?: React.ReactNode;
}

export function SearchGuard({ children, fallback = null }: SearchGuardProps) {
if (!isSearchSurfaceEnabled()) {
return <>{fallback}</>;
  }
return <>{children}</>;
}
