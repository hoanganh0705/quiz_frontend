'use client';

import type { AuditLogEntryDto } from '../types';

import { AuditLogItem } from './AuditLogItem';

export interface AuditLogListProps {

entries: readonly AuditLogEntryDto[];

onEntryClick: (entry: AuditLogEntryDto) => void;
}

export function AuditLogList({
entries,
onEntryClick,
}: AuditLogListProps): React.ReactElement {
return (
<ul
role="list"
aria-label="Audit log entries"
className="m-0 list-none space-y-2 p-0"
data-testid="audit-log-list"
    >
{entries.map((entry) => (
<li key={entry.id} className="list-none">
<AuditLogItem entry={entry} onClick={onEntryClick} />
</li>
      ))}
</ul>
  );
}