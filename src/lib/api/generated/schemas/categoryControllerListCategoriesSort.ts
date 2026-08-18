

export type CategoryControllerListCategoriesSort = typeof CategoryControllerListCategoriesSort[keyof typeof CategoryControllerListCategoriesSort] | null;

export const CategoryControllerListCategoriesSort = {
name: 'name',
createdAt: 'createdAt',
} as const;
