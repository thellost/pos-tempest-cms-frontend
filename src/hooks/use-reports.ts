import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ProfitLossReportParams } from '@/lib/services/reports'
import { downloadProfitLossReport } from '@/lib/services/reports'

export function useDownloadProfitLossReport() {
  return useMutation({
    mutationFn: (params: ProfitLossReportParams) =>
      downloadProfitLossReport(params),
    onError: (err: Error) => toast.error(err.message),
  })
}
