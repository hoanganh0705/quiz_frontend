

export const TAG_SLUG_REGEX: RegExp =
/^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidTagSlug(value: string): boolean {
return TAG_SLUG_REGEX.test(value);
}
