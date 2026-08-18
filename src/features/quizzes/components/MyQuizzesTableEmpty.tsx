

import Link from "next/link";

import { Inbox, PenLine, Globe } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

import type { MyQuizzesTab } from "@/features/quizzes/types/my-quizzes";

interface MyQuizzesTableEmptyProps {

tab: "all" | "drafts" | "published";
}

const CONTENT: Record<
MyQuizzesTableEmptyProps["tab"],
{ title: string; description: string; ctaLabel?: string }
> = {
all: {
title: "You haven't created any quizzes yet",
description: "Create your first one to get started.",
ctaLabel: "Create Quiz",
  },
drafts: {
title: "No drafts",
description: "Start a new quiz from the create page.",
ctaLabel: "Create Quiz",
  },
published: {
title: "Nothing published yet",
description: "Publish a draft to see it here.",
  },
};

const ICONS: Record<MyQuizzesTableEmptyProps["tab"], React.ComponentType<unknown>> = {
all: Inbox as unknown as React.ComponentType<unknown>,
drafts: PenLine as unknown as React.ComponentType<unknown>,
published: Globe as unknown as React.ComponentType<unknown>,
};

export function MyQuizzesTableEmpty({
tab,
}: MyQuizzesTableEmptyProps): React.ReactElement {
const content = CONTENT[tab];
const hasCta = Boolean(content.ctaLabel);

return (
<EmptyState
icon={ICONS[tab]}
title={content.title}
description={content.description}
actions={
hasCta
? [
{
label: content.ctaLabel!,
href: "/create-quiz",
variant: "default" as const,
              },
            ]
: undefined
      }
    />
  );
}
