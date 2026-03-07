// ─── Note ─────────────────────────────────────────────────────────────────────
// Tax/service-charge settings live on the Branch entity.
// This file proxies the branches hooks under tax-config–friendly names.
// ─────────────────────────────────────────────────────────────────────────────

export {
  useBranches as useTaxConfigs,
  useBranch as useTaxConfig,
  useUpdateBranch as useUpdateTaxConfig,
} from '@/hooks/use-branches'
