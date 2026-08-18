

import type { ReportDto } from './reportDto';
import type { ListReports200AllOfMeta } from './listReports200AllOfMeta';

export type ListReports200AllOf = {
data?: ReportDto[];
meta?: ListReports200AllOfMeta;
};
