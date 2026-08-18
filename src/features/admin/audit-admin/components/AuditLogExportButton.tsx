'use client';

import { useCallback, useState } from 'react';

import { Download } from 'lucide-react';

import type { AuditLogFilters } from '../types';
import { logger } from '@/shared/log';

const EXPORT_FORMATS = ['csv', 'json'] as const;
type ExportFormat = (typeof EXPORT_FORMATS)[number];

export interface AuditLogExportButtonProps {

filters?: AuditLogFilters;

exportSupported?: boolean;

onExport?: (format: ExportFormat, filters: AuditLogFilters) => Promise<void>;
}

export function AuditLogExportButton({
filters = {},
exportSupported = false,
onExport,
}: AuditLogExportButtonProps): React.ReactElement {
const [isExporting, setIsExporting] = useState(false);

const handleExport = useCallback(
async (format: ExportFormat) => {
if (!exportSupported || isExporting) return;
try {
setIsExporting(true);
if (onExport) {
await onExport(format, filters);
        } else {

logger.warn(
'admin.audit.export',
'Export not yet implemented',
{ format },
          );
        }
      } finally {
setIsExporting(false);
      }
    },
[exportSupported, isExporting, onExport, filters],
  );

return (
<div className="relative" data-testid="audit-log-export-button">
<button
type="button"
disabled={!exportSupported || isExporting}
className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
data-testid="audit-log-export-trigger"
title={
exportSupported
? 'Export audit log'
: 'Export is not yet supported by the backend'
        }
      >
<Download className="h-4 w-4" aria-hidden="true" />
{isExporting ? 'Exporting…' : 'Export'}
</button>

{!exportSupported && (
<p
className="mt-1 text-xs text-muted-foreground/70"
data-testid="audit-log-export-unsupported"
        >
Export not yet supported by backend.
        </p>
      )}

{exportSupported && (
<div className="mt-2 flex gap-2">
{EXPORT_FORMATS.map((format) => (
<button
key={format}
type="button"
disabled={isExporting}
onClick={() => handleExport(format)}
className="rounded-md border border-border bg-background px-2 py-1 text-xs uppercase text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
data-testid={`audit-log-export-${format}`}
            >
{format}
</button>
          ))}
</div>
      )}
</div>
  );
}