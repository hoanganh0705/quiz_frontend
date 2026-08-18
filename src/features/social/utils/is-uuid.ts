

const UUID_SHAPE_RE =
/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
if (typeof value !== "string") return false;
if (value.length === 0) return false;
return UUID_SHAPE_RE.test(value);
}
