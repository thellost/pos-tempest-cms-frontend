import { supabase } from '@/lib/supabase'
import { ApiError, buildQueryParams } from '@/lib/api-client'

export type ProfitLossLayout = 'summary' | 'full'

export interface ProfitLossReportParams {
  branchId?: number
  dateFrom?: string
  dateTo?: string
  layout?: ProfitLossLayout
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

const DEFAULT_FILENAME = 'laporan-laba-rugi.xlsx'

function parseFilename(contentDisposition: string | null): string {
  if (!contentDisposition) return DEFAULT_FILENAME
  // Handles both `filename="...xlsx"` and `filename*=UTF-8''...xlsx` forms.
  const ascii = /filename="?([^";]+)"?/.exec(contentDisposition)
  if (ascii) return ascii[1]
  const utf8 = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(contentDisposition)
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1])
    } catch {
      return utf8[1]
    }
  }
  return DEFAULT_FILENAME
}

export async function downloadProfitLossReport(
  params: ProfitLossReportParams,
): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const path = `/api/v1/reports/profit-loss/export${buildQueryParams({
    branch_id: params.branchId,
    date_from: params.dateFrom,
    date_to: params.dateTo,
    layout: params.layout ?? 'full',
  })}`

  const url = `${BASE_URL}${path}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    let code = 'API_ERROR'
    try {
      const envelope = await response.json()
      const errPayload = envelope?.error
      if (typeof errPayload === 'object' && errPayload !== null) {
        message = errPayload.message ?? message
        code = errPayload.code ?? code
      } else if (typeof errPayload === 'string') {
        message = errPayload
      } else if (typeof envelope?.error === 'string') {
        message = envelope.error
      }
    } catch {
      // Response wasn't JSON (e.g. binary error page); keep defaults.
    }
    throw new ApiError(message, code, response.status)
  }

  const blob = await response.blob()
  const filename = parseFilename(response.headers.get('Content-Disposition'))

  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}
