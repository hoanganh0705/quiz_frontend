

import type {
CancelCountdown202,
CloseInstance202,
CreateInstance201,
CreateInstanceDto,
GetInstanceById200,
GetInstanceLeaderboard200,
GetInstanceLeaderboardParams,
JoinInstance201,
ListInstancePlayers200,
ListInstancePlayersParams,
ListInstances200,
ListInstancesParams,
StartCountdown200,
StartCountdownDto,
StartInstance202
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getInstances = () => {

const createInstance = (
createInstanceDto: CreateInstanceDto,
 ) => {
return orvalCustomInstance<CreateInstance201>(
{url: `/api/v1/instances`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: createInstanceDto
    },
      );
    }

const listInstances = (
params?: ListInstancesParams,
 ) => {
return orvalCustomInstance<ListInstances200>(
{url: `/api/v1/instances`, method: 'GET',
params
    },
      );
    }

const listInstancePlayers = (
id: string,
params?: ListInstancePlayersParams,
 ) => {
return orvalCustomInstance<ListInstancePlayers200>(
{url: `/api/v1/instances/${id}/players`, method: 'GET',
params
    },
      );
    }

const getInstanceById = (
id: string,
 ) => {
return orvalCustomInstance<GetInstanceById200>(
{url: `/api/v1/instances/${id}`, method: 'GET'
    },
      );
    }

const joinInstance = (
id: string,
 ) => {
return orvalCustomInstance<JoinInstance201>(
{url: `/api/v1/instances/${id}/join`, method: 'POST'
    },
      );
    }

const startInstance = (
id: string,
 ) => {
return orvalCustomInstance<StartInstance202>(
{url: `/api/v1/instances/${id}/start`, method: 'POST'
    },
      );
    }

const closeInstance = (
id: string,
 ) => {
return orvalCustomInstance<CloseInstance202>(
{url: `/api/v1/instances/${id}/close`, method: 'POST'
    },
      );
    }

const startCountdown = (
id: string,
startCountdownDto: StartCountdownDto,
 ) => {
return orvalCustomInstance<StartCountdown200>(
{url: `/api/v1/instances/${id}/countdown`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: startCountdownDto
    },
      );
    }

const cancelCountdown = (
id: string,
 ) => {
return orvalCustomInstance<CancelCountdown202>(
{url: `/api/v1/instances/${id}/countdown/cancel`, method: 'POST'
    },
      );
    }

const getInstanceLeaderboard = (
id: string,
params?: GetInstanceLeaderboardParams,
 ) => {
return orvalCustomInstance<GetInstanceLeaderboard200>(
{url: `/api/v1/instances/${id}/leaderboard`, method: 'GET',
params
    },
      );
    }
return {createInstance,listInstances,listInstancePlayers,getInstanceById,joinInstance,startInstance,closeInstance,startCountdown,cancelCountdown,getInstanceLeaderboard}};
export type CreateInstanceResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getInstances>['createInstance']>>>
export type ListInstancesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getInstances>['listInstances']>>>
export type ListInstancePlayersResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getInstances>['listInstancePlayers']>>>
export type GetInstanceByIdResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getInstances>['getInstanceById']>>>
export type JoinInstanceResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getInstances>['joinInstance']>>>
export type StartInstanceResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getInstances>['startInstance']>>>
export type CloseInstanceResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getInstances>['closeInstance']>>>
export type StartCountdownResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getInstances>['startCountdown']>>>
export type CancelCountdownResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getInstances>['cancelCountdown']>>>
export type GetInstanceLeaderboardResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getInstances>['getInstanceLeaderboard']>>>
