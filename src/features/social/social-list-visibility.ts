

export type SocialListVisibility =
| "visible"
  | "private"
  | "blocked_viewer"
  | "blocked_by_viewer"
  | "not_found";

export const SOCIAL_LIST_VISIBILITIES = [
"visible",
"private",
"blocked_viewer",
"blocked_by_viewer",
"not_found",
] as const satisfies readonly SocialListVisibility[];

export function isSocialListVisibility(
value: unknown,
): value is SocialListVisibility {
return (
typeof value === "string" &&
(SOCIAL_LIST_VISIBILITIES as readonly string[]).includes(value)
  );
}
