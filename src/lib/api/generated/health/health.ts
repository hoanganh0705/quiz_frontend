

import type {
HealthControllerCheck200
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getHealth = () => {

const healthControllerCheck = (

 ) => {
return orvalCustomInstance<HealthControllerCheck200>(
{url: `/api/v1/health`, method: 'GET'
    },
      );
    }
return {healthControllerCheck}};
export type HealthControllerCheckResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getHealth>['healthControllerCheck']>>>
