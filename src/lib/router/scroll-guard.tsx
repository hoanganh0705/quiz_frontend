"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

const UUIDV4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function matchesUnstableId(segment: string): boolean {
return UUIDV4_PATTERN.test(segment);
}

export function urlContainsUnstableId(href: string): boolean {
try {

const url = new URL(href, "http://localhost");
const segments = url.pathname.split("/").filter(Boolean);

return segments.some(matchesUnstableId);
  } catch {

return false;
  }
}

interface ScrollGuardProps {

children: React.ReactNode;
}

export function ScrollGuard({ children }: ScrollGuardProps) {
const router = useRouter();

useEffect(() => {

const handlePopState = () => {
const currentHref = window.location.href;
if (urlContainsUnstableId(currentHref)) {

Sentry.addBreadcrumb({
category: "social:6.5",
message: "url-rejected-id-guard",
level: "warning",
data: {
reason: "rejected_unstable_id",
href: currentHref,
          },
        });

window.history.pushState(null, "", "/social");
router.replace("/social");
      }
    };

const originalPushState = window.history.pushState.bind(window.history);
const originalReplaceState = window.history.replaceState.bind(window.history);

function interceptPushState(

state: any,
_unused: string,
url?: string | URL | null,
    ) {
const targetHref = url?.toString() ?? window.location.href;
if (urlContainsUnstableId(targetHref)) {
Sentry.addBreadcrumb({
category: "social:6.5",
message: "url-rejected-id-guard",
level: "warning",
data: {
reason: "rejected_unstable_id",
href: targetHref,
          },
        });

return originalReplaceState.call(window.history, state, _unused, "/social");
      }
return originalPushState.call(window.history, state, _unused, url);
    }

function interceptReplaceState(

state: any,
_unused: string,
url?: string | URL | null,
    ) {
const targetHref = url?.toString() ?? window.location.href;
if (urlContainsUnstableId(targetHref)) {
Sentry.addBreadcrumb({
category: "social:6.5",
message: "url-rejected-id-guard",
level: "warning",
data: {
reason: "rejected_unstable_id",
href: targetHref,
          },
        });

return originalReplaceState.call(window.history, state, _unused, "/social");
      }
return originalReplaceState.call(window.history, state, _unused, url);
    }

window.history.pushState = interceptPushState;
window.history.replaceState = interceptReplaceState;

handlePopState();

window.addEventListener("popstate", handlePopState);

return () => {
window.history.pushState = originalPushState;
window.history.replaceState = originalReplaceState;
window.removeEventListener("popstate", handlePopState);
    };
  }, [router]);

return <>{children}</>;
}
