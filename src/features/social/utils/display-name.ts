export function displayNameOf(input: {
  displayName?: unknown;
  username?: string | null;
  userName?: string | null;
}): string {
  if (
    typeof input.displayName === "string" &&
    input.displayName.trim().length > 0
  ) {
    return input.displayName;
  }
  const userName = input.userName ?? input.username;
  return userName ?? "Unknown user";
}
