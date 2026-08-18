

import type { TimeSeriesPointDto } from './timeSeriesPointDto';

export interface TimeSeriesDto {

bucket: string;

unit: string;

points: TimeSeriesPointDto[];
}
