// ─── Note ─────────────────────────────────────────────────────────────────────
//
// The backend has no separate /api/v1/tax-configs endpoint.
// Tax rate and service charge rate are fields on the Branch entity.
// The Tax Configuration page uses the branches service to read/update these.
//
// Re-export Branch types under the names expected by the tax page for clarity.
// ─────────────────────────────────────────────────────────────────────────────

export type { Branch as TaxConfig } from '@/lib/services/branches'
export type { UpdateBranchPayload as UpdateTaxConfigPayload } from '@/lib/services/branches'
export { branchesService as taxConfigsService } from '@/lib/services/branches'
