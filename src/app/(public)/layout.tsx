import type { ReactNode } from "react";

import { BookmarksLookupHydrator } from "@/features/bookmarks/components/BookmarksLookupHydrator";
import { FollowedLookupHydrator } from "@/features/tags/components/FollowedLookupHydrator";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <FollowedLookupHydrator />
      <BookmarksLookupHydrator />
      {children}
    </>
  );
}
