

import type { ProblemDetailDtoExtensions } from './problemDetailDtoExtensions';

export interface ProblemDetailDto {

type: string;

title: string;

status: number;

detail?: string;

instance?: string;

extensions?: ProblemDetailDtoExtensions;
}
