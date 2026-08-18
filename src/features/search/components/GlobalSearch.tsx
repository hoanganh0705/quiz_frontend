"use client";

import * as React from "react";

import { SearchInput } from "./SearchInput";
import { useSearchUrlState } from "@/features/search/hooks/useSearchUrlState";
import { SearchGuard } from "@/features/search/lib/guard";

export function GlobalSearch() {
return (
<SearchGuard fallback={null}>
<GlobalSearchInner />
</SearchGuard>
  );
}

function GlobalSearchInner() {
const { setQuery } = useSearchUrlState();

const handleSubmit = React.useCallback(
(q: string) => {

setQuery(q);
    },
[setQuery],
  );

return (
<div className="hidden sm:flex items-center gap-2 flex-1 min-w-0 max-w-sm sm:max-w-md lg:max-w-xl">
<SearchInput
onSubmit={handleSubmit}
placeholder="Search quizzes, users, tournaments…"
className="w-full"
      />
</div>
  );
}
