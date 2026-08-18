

import type { CategoryControllerListCategoriesSort } from './categoryControllerListCategoriesSort';
import type { CategoryControllerListCategoriesOrder } from './categoryControllerListCategoriesOrder';

export type CategoryControllerListCategoriesParams = {

cursor?: string | null;

limit?: number | null;

sort?: CategoryControllerListCategoriesSort;

order?: CategoryControllerListCategoriesOrder;
};
