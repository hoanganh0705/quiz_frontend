"use client";

import { Suspense, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useMemo } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { SocialSearchPlaceholder } from "@/features/social/components/SocialSearchPlaceholder";
import { UserSearchResults } from "@/features/social/lists/UserSearchResults";

function SearchRouteGate(): React.ReactElement {
const searchParams = useSearchParams();
const router = useRouter();
const pathname = usePathname();

const { isAuthenticated, isBootstrapping } = useAuthSession();

const flagValue = useMemo(
() => getFeatureFlagValue("social_user_search_live"),
[],
  );

const query = useMemo(() => searchParams.get("q") ?? "", [searchParams]);

const handleQueryChange = useCallback(
(next: string) => {
const params = new URLSearchParams(searchParams.toString());
if (next.trim() === "") {
params.delete("q");
      } else {
params.set("q", next);
      }
router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
[router, pathname, searchParams],
  );

if (isBootstrapping) {
return (
<div className="flex items-center justify-center p-8">
<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
</div>
    );
  }

if (flagValue === "placeholder") {
return <SocialSearchPlaceholder />;
  }

if (isAuthenticated) {
return <UserSearchResults query={query} onQueryChange={handleQueryChange} />;
  }

return <SocialSearchPlaceholder />;
}

export default function SearchRoute(): React.ReactElement {
return (
<Suspense fallback={<RouteGateSkeleton />}>
<SearchRouteGate />
</Suspense>
  );
}
