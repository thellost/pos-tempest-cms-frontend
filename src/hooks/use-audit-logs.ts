import { useQuery } from '@tanstack/react-query'
import { auditLogsService } from '@/lib/services/audit-logs'
import { queryKeys, type AuditLogFilters } from '@/lib/query-keys'

// ─── Read ──────────────────────────────────────────────────────────────────────

export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: queryKeys.auditLogs.list(filters),
    queryFn: () => auditLogsService.list(filters),
  })
}

export function useAuditLogsByRecord(tableName: string, recordId: number) {
  return useQuery({
    queryKey: queryKeys.auditLogs.record(tableName, recordId),
    queryFn: () => auditLogsService.getByRecord(tableName, recordId),
    enabled: !!tableName && recordId > 0,
  })
}
