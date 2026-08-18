

import type { ConsistencyReportIssueDto } from './consistencyReportIssueDto';

export interface ConsistencyReportResponseDto {

totalIssues: number;

fixed: number;

issues: ConsistencyReportIssueDto[];
}
