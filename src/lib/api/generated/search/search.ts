

import type {
SearchControllerGetSearchResults200,
SearchControllerGetSearchResultsParams
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getSearch = () => {
const searchControllerGetSearchResults = (
params: SearchControllerGetSearchResultsParams,
 ) => {
return orvalCustomInstance<SearchControllerGetSearchResults200>(
{url: `/api/v1/search`, method: 'GET',
params
    },
      );
    }
return {searchControllerGetSearchResults}};
export type SearchControllerGetSearchResultsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getSearch>['searchControllerGetSearchResults']>>>
