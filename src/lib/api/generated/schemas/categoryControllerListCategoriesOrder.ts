

export type CategoryControllerListCategoriesOrder = typeof CategoryControllerListCategoriesOrder[keyof typeof CategoryControllerListCategoriesOrder] | null;

export const CategoryControllerListCategoriesOrder = {
asc: 'asc',
desc: 'desc',
} as const;
