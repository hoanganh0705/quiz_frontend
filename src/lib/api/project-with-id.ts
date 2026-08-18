

export type ProjectWithId<
T,
Alias extends keyof T = keyof T & 'id',
> = T & { readonly id: T[Alias & keyof T] };

export function projectWithId<
T extends Record<string, unknown>,
Alias extends keyof T,
>(items: readonly T[], alias: Alias): Array<ProjectWithId<T, Alias>> {
return items.map((item) => ({
...item,
id: item[alias],
  })) as Array<ProjectWithId<T, Alias>>;
}