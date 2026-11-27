import type { ReactNode } from "react";

import { FollowedLookupHydrator } from "@/shared/layout/components/FollowedLookupHydrator";

import { BookmarksLookupHydrator } from "@/features/bookmarks/components/BookmarksLookupHydrator";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <FollowedLookupHydrator />
      <BookmarksLookupHydrator />
      {children}
    </>
  );
}
