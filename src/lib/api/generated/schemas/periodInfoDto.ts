

import type { PeriodInfoDtoType } from './periodInfoDtoType';
import type { PeriodInfoDtoEnd } from './periodInfoDtoEnd';

export interface PeriodInfoDto {

type: PeriodInfoDtoType;

start: string;

end?: PeriodInfoDtoEnd;

resetInSeconds: number;
}
