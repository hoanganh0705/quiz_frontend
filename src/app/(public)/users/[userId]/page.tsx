"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ProfilePage from "@/app/(public)/profile/[name]/page";

export default function UserProfileRoute() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params?.userId === "me") {
      router.replace("/my-profile");
    }
  }, [params?.userId, router]);

  if (params?.userId === "me") {
    return null;
  }

  return <ProfilePage />;
}
