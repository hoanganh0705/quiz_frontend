

import { mutate } from "swr";

import type { Key, MutatorOptions } from "swr";

export function mutateCarefully(
key: Key | null | undefined,
dataOrOpts?: boolean | Promise<unknown> | MutatorOptions,
): Promise<unknown> | undefined {
if (typeof window === "undefined") return undefined;
if (key === null || key === undefined) return undefined;

const opts: MutatorOptions =
typeof dataOrOpts === "object" &&
dataOrOpts !== null &&
!(dataOrOpts instanceof Promise)
? dataOrOpts
: { revalidate: true };

return mutate(key, undefined, { ...opts, revalidate: true });
}
