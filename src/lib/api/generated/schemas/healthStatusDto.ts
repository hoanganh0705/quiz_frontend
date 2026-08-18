

import type { HealthStatusDtoStatus } from './healthStatusDtoStatus';
import type { HealthStatusDtoDatabase } from './healthStatusDtoDatabase';
import type { HealthStatusDtoRedis } from './healthStatusDtoRedis';

export interface HealthStatusDto {

status: HealthStatusDtoStatus;

database: HealthStatusDtoDatabase;

redis: HealthStatusDtoRedis;
}
