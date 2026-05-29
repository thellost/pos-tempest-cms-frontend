import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth-guards'
import { useAuth } from '@/hooks/use-auth'
import { useBranches } from '@/hooks/use-branches'
import { useAppForm } from '@/hooks/use-form'
import {
  useCashTransactionReasons,
  useCreateCashTransactionReason,
  useUpdateCashTransactionReason,
  useDeactivateCashTransactionReason,
} from '@/hooks/use-cash-reasons'
import type {
  CashTransactionReason,
  CashTransactionReasonType,
  CreateCashTransactionReasonPayload,
  UpdateCashTransactionReasonPayload,
} from '@/lib/services/cash-reasons'
import { getCashReasonColumns } from '@/components/cash-reasons/columns'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/page-header'
import { DataTable } from '@/components/data-table/data-table'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/cash-reasons/')({
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: CashReasonsPage,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: '', label: 'Both (cash in & out)' },
  { value: 'cash_in', label: 'Cash In only' },
  { value: 'cash_out', label: 'Cash Out only' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

function CashReasonsPage() {
  const isMobile = useIsMobile()
  const { role, branchId: userBranchId } = useAuth()
  const isAdmin = role === 'admin'
  const canEdit = role === 'admin' || role === 'manager'

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Branch filter (admin only; non-admin auto-scoped by API)
  const [filterBranchId, setFilterBranchId] = useState<string>(
    isAdmin ? 'all' : String(userBranchId ?? ''),
  )

  // Create / edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReason, setEditingReason] =
    useState<CashTransactionReason | null>(null)

  // Deactivate confirmation
  const [deactivateTarget, setDeactivateTarget] =
    useState<CashTransactionReason | null>(null)
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  const filters = useMemo(
    () => ({
      branch_id:
        isAdmin && filterBranchId && filterBranchId !== 'all'
          ? Number(filterBranchId)
          : undefined,
      page,
      page_size: pageSize,
    }),
    [isAdmin, filterBranchId, page, pageSize],
  )

  const { data, isLoading } = useCashTransactionReasons(filters)
  const deactivateMutation = useDeactivateCashTransactionReason()

  const { data: branchesData } = useBranches({ pageSize: 100 })

  const columns = useMemo(
    () =>
      getCashReasonColumns({
        onEdit: (reason) => {
          setEditingReason(reason)
          setDialogOpen(true)
        },
        onDeactivate: (reason) => {
          setDeactivateTarget(reason)
          setDeactivateOpen(true)
        },
        canEdit,
      }),
    [canEdit],
  )

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingReason(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Transaction Reasons"
        description="Manage reason labels for cash-in and cash-out transactions. Each branch can define its own set of reasons."
        actions={
          canEdit ? (
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="mr-2 size-4" />
              Add Reason
            </Button>
          ) : undefined
        }
      />

      {/* Branch filter (admin only) */}
      {isAdmin && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Branch:</span>
          <Select
            value={filterBranchId}
            onValueChange={(v) => {
              setFilterBranchId(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {(branchesData?.data ?? []).map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        meta={data?.meta}
        isLoading={isLoading}
        pagination={{ page, pageSize }}
        onPaginationChange={({ page: p, pageSize: ps }) => {
          setPage(p)
          setPageSize(ps)
        }}
        initialColumnVisibility={
          isMobile ? { sort_order: false } : {}
        }
        emptyMessage="No cash transaction reasons found."
      />

      {/* ── Create / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
          else setDialogOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingReason ? 'Edit Reason' : 'Add Reason'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-1">
            <CashReasonForm
              key={editingReason?.id ?? 'new'}
              reason={editingReason ?? undefined}
              branches={branchesData?.data ?? []}
              isAdmin={isAdmin}
              userBranchId={userBranchId}
              onSuccess={closeDialog}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Deactivate Confirmation ── */}
      <ConfirmDialog
        title={`Deactivate "${deactivateTarget?.label}"?`}
        description="This reason will be marked inactive and hidden from the POS app."
        confirmLabel="Deactivate"
        variant="destructive"
        isLoading={deactivateMutation.isPending}
        open={deactivateOpen}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null)
          setDeactivateOpen(open)
        }}
        onConfirm={() => {
          if (!deactivateTarget) return
          deactivateMutation.mutate(deactivateTarget.id, {
            onSuccess: () => {
              setDeactivateOpen(false)
              setDeactivateTarget(null)
            },
          })
        }}
      />
    </div>
  )
}

// ─── Cash Reason Form ─────────────────────────────────────────────────────────

interface CashReasonFormProps {
  reason?: CashTransactionReason
  branches: { id: number; name: string }[]
  isAdmin: boolean
  userBranchId: number | null
  onSuccess: () => void
}

function CashReasonForm({
  reason,
  branches,
  isAdmin,
  userBranchId,
  onSuccess,
}: CashReasonFormProps) {
  const isEdit = !!reason
  const createMutation = useCreateCashTransactionReason()
  const updateMutation = useUpdateCashTransactionReason()

  const branchOptions = useMemo(
    () => branches.map((b) => ({ value: b.id, label: b.name })),
    [branches],
  )

  const form = useAppForm({
    defaultValues: {
      branch_id:
        reason?.branch_id ?? (isAdmin ? (null as number | null) : userBranchId),
      key: reason?.key ?? '',
      label: reason?.label ?? '',
      type: (reason?.type ?? '') as CashTransactionReasonType | '',
      sort_order: reason?.sort_order ?? 0,
      is_active: reason?.is_active ?? true,
    },
    onSubmit: async ({ value }) => {
      const typeValue =
        value.type === '' ? (null as unknown as undefined) : value.type

      if (isEdit && reason) {
        const payload: UpdateCashTransactionReasonPayload = {
          key: value.key,
          label: value.label,
          type: typeValue,
          sort_order: value.sort_order,
          is_active: value.is_active,
        }
        await updateMutation.mutateAsync({ id: reason.id, payload })
      } else {
        const payload: CreateCashTransactionReasonPayload = {
          key: value.key,
          label: value.label,
          type: value.type as CashTransactionReasonType | undefined,
          sort_order: value.sort_order,
          branch_id: isAdmin ? (value.branch_id ?? undefined) : undefined,
        }
        await createMutation.mutateAsync(payload)
      }

      onSuccess()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4 pb-2"
    >
      {/* Branch (admin only) */}
      {isAdmin && (
        <form.AppField
          name="branch_id"
          validators={{
            onChange: ({ value }) =>
              !value ? 'Branch is required' : undefined,
          }}
        >
          {(field) => (
            <field.ComboboxField
              label="Branch"
              options={branchOptions}
              placeholder="Select branch…"
              searchPlaceholder="Search branches…"
              emptyMessage="No branches found."
            />
          )}
        </form.AppField>
      )}

      {/* Key */}
      <form.AppField
        name="key"
        validators={{
          onChange: ({ value }) => {
            if (!value?.trim()) return 'Key is required'
            if (value.length > 100) return 'Max 100 characters'
            if (!/^[a-z][a-z0-9_]*$/.test(value))
              return 'Lowercase letters, numbers, and underscores only; must start with a letter'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Key"
            placeholder="e.g. supply_purchase"
            description="Unique identifier. Used by the POS app. Lowercase snake_case."
          />
        )}
      </form.AppField>

      {/* Label */}
      <form.AppField
        name="label"
        validators={{
          onChange: ({ value }) => {
            if (!value?.trim()) return 'Label is required'
            if (value.length > 200) return 'Max 200 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Label"
            placeholder="e.g. Supply Purchase"
            description="Human-readable label displayed in the POS app."
          />
        )}
      </form.AppField>

      {/* Type */}
      <form.AppField name="type">
        {(field) => (
          <field.SelectField
            label="Transaction Type"
            options={TYPE_OPTIONS}
            description="Which transaction type this reason applies to. 'Both' shows in both cash-in and cash-out."
          />
        )}
      </form.AppField>

      {/* Sort Order */}
      <form.AppField name="sort_order">
        {(field) => (
          <field.NumberField
            label="Sort Order"
            description="Lower numbers appear first in the POS reason list."
            min={0}
            step={1}
          />
        )}
      </form.AppField>

      {/* Is Active (edit only) */}
      {isEdit && (
        <form.AppField name="is_active">
          {(field) => (
            <field.SwitchField
              label="Active"
              description="Inactive reasons won't appear in the POS."
            />
          )}
        </form.AppField>
      )}

      {/* Submit */}
      <div className="flex pt-2 sm:justify-end">
        <form.AppForm>
          <form.SubscribeButton
            label={isEdit ? 'Save Changes' : 'Create Reason'}
            className="w-full min-w-[130px] sm:w-auto"
          />
        </form.AppForm>
      </div>
    </form>
  )
}
