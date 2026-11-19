import { isServer } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

export function mutateCarefully(
  key: unknown,
  _dataOrOpts?: unknown,
): Promise<unknown> | undefined {
  if (isServer || key === null || key === undefined) return undefined;
  const queryKey = Array.isArray(key) ? key : [key];
  return getQueryClient().invalidateQueries({ queryKey });
}
