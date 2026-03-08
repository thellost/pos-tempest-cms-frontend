import { api, buildQueryParams } from '@/lib/api-client'
import type { AuditLogFilters } from '@/lib/query-keys'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'VOID'
  | 'REFUND'
  | 'PRINT'
  | 'OPEN_DRAWER'
  | 'OVERRIDE'
  | 'STATUS_CHANGE'

export interface AuditLog {
  id: number
  user_id: number | null
  branch_id: number | null
  action: AuditAction
  table_name: string | null
  record_id: number | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  description: string | null
  ip_address: string | null
  user_agent: string | null
  session_id: string | null
  created_at: string
  // Enriched
  user_name: string | null
  branch_name: string | null
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const auditLogsService = {
  list: (filters?: AuditLogFilters) => {
    const {
      page,
      pageSize,
      userId,
      branchId,
      action,
      tableName,
      recordId,
      dateFrom,
      dateTo,
    } = filters ?? {}
    const params: Record<string, unknown> = {}
    if (userId) params.user_id = userId
    if (branchId) params.branch_id = branchId
    if (action) params.action = action
    if (tableName) params.table_name = tableName
    if (recordId) params.record_id = recordId
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    return api.get<AuditLog[]>(
      `/api/v1/audit-logs${buildQueryParams(params, { page: page ?? 1, pageSize: pageSize ?? 20 })}`,
    )
  },

  getByRecord: (tableName: string, recordId: number) =>
    api.get<AuditLog[]>(`/api/v1/audit-logs/record/${tableName}/${recordId}`),
}
