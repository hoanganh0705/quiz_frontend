"use client";

import { type ReactElement } from "react";

import { type SocialListKind } from "./SocialListKind";

export type PrivacyRestrictedNoticeVariant = "not_available" | "friends_only";

interface PrivacyRestrictedNoticeProps {
variant: PrivacyRestrictedNoticeVariant;

resourceKind: SocialListKind;
}

const COPY: Record<PrivacyRestrictedNoticeVariant, { title: string; body: string }> = {
not_available: {
title: "Not available",
body: "This information isn't available right now.",
  },
friends_only: {
title: "For friends only",
body: "Only the user and their friends can see this.",
  },
};

export function PrivacyRestrictedNotice(
props: PrivacyRestrictedNoticeProps,
): ReactElement {
const { variant, resourceKind } = props;
const copy = COPY[variant];
return (
<section
data-testid={`privacy-restricted-notice-${variant}`}
data-resource-kind={resourceKind}
role="status"
aria-label={copy.title}
className="flex flex-col gap-2 p-6"
    >
<h2 className="text-lg font-semibold">{copy.title}</h2>
<p className="text-sm text-muted-foreground">{copy.body}</p>
</section>
  );
}