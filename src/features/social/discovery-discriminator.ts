

export type SocialSearchSuggestionKind =
| "user"
  | "quiz"
  | "tag"
  | "group"
  | "unsupported";

export function isSocialSearchSuggestionKind(
value: unknown,
): value is SocialSearchSuggestionKind {
return (
typeof value === "string" &&
(DOCUMENTED_KINDS as readonly string[]).includes(value)
  );
}

const DOCUMENTED_KINDS = [
"user",
"quiz",
"tag",
"group",
"unsupported",
] as const satisfies readonly SocialSearchSuggestionKind[];

export const DEFENSIVE_FALLBACK_TESTID =
"social-search-unsupported-kind" as const;

export const DISCOVERY_DISCRIMINATOR_INVARIANTS = Object.freeze({
documentedKinds: DOCUMENTED_KINDS,
defensiveFallbackTestId: DEFENSIVE_FALLBACK_TESTID,
});
