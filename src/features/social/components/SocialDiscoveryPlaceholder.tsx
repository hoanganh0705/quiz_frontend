"use client";

import type { ReactElement } from "react";

interface SocialDiscoveryPlaceholderProps {

surface: "suggestions" | "trending";
}

const COPY: Record<
SocialDiscoveryPlaceholderProps["surface"],
{ title: string; description: string }
> = {
suggestions: {
title: "People you might know",
description:
"Discover people to connect with based on mutual friends and interests.",
  },
trending: {
title: "Trending users",
description: "See who's making waves on the platform right now.",
  },
};

export function SocialDiscoveryPlaceholder({
surface,
}: SocialDiscoveryPlaceholderProps): ReactElement {
const copy = COPY[surface];
return (
<section
data-testid={"social-discovery-placeholder-" + surface}
aria-label={`${copy.title} (placeholder)`}
className="flex flex-col gap-2 p-6"
    >
<h2 className="text-lg font-semibold">{copy.title}</h2>
<p className="text-sm text-muted-foreground">{copy.description}</p>
</section>
  );
}
