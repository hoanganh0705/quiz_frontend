import { getQueryClient } from "@/providers/QueryProvider";

export function userBadgesKey(
  userId: string,
): readonly ["admin", "achievement", "user-badges", string] {
  return ["admin", "achievement", "user-badges", userId] as const;
}

export function userHistoryKey(
  userId: string,
  pageIndex = 0,
): readonly ["admin", "achievement", "user-history", string, number] {
  return ["admin", "achievement", "user-history", userId, pageIndex] as const;
}

export async function invalidateAchievementAdmin(
  userId: string,
  mutateFn?: (key: unknown) => unknown,
): Promise<void> {
  const qc = getQueryClient();
  await Promise.all([
    qc.invalidateQueries({ queryKey: userBadgesKey(userId) }),
    qc.invalidateQueries({
      queryKey: ["admin", "achievement", "user-history", userId],
    }),
  ]);

  if (mutateFn) {
    await mutateFn(userBadgesKey(userId));

    await mutateFn((key: unknown) => {
      if (!Array.isArray(key)) return false;
      return (
        key.length >= 4 &&
        key[0] === "admin" &&
        key[1] === "achievement" &&
        key[2] === "user-history" &&
        key[3] === userId
      );
    });
  }
}
