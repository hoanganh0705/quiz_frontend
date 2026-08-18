

import type {
HomeControllerGetBundle200
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getHome = () => {

const homeControllerGetBundle = (

 ) => {
return orvalCustomInstance<HomeControllerGetBundle200>(
{url: `/api/v1/home`, method: 'GET'
    },
      );
    }
return {homeControllerGetBundle}};
export type HomeControllerGetBundleResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getHome>['homeControllerGetBundle']>>>
