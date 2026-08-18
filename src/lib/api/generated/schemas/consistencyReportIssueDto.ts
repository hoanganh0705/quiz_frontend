

import type { ConsistencyReportIssueDtoType } from './consistencyReportIssueDtoType';
import type { ConsistencyReportIssueDtoUserId } from './consistencyReportIssueDtoUserId';
import type { ConsistencyReportIssueDtoSeverity } from './consistencyReportIssueDtoSeverity';

export interface ConsistencyReportIssueDto {

type: ConsistencyReportIssueDtoType;

userId?: ConsistencyReportIssueDtoUserId;

description: string;

severity: ConsistencyReportIssueDtoSeverity;
}
