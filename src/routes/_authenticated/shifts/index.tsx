import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useAppForm } from '@/hooks/use-form'
import { useShifts, useOpenShift, useCloseShift } from '@/hooks/use-shifts'
import { useDevices } from '@/hooks/use-devices'
import { useBranches } from '@/hooks/use-branches'
import type { Shift, CloseShiftPayload } from '@/lib/services/shifts'
import { getShiftColumns } from '@/components/shifts/columns'
import { FilterBar } from '@/components/filter-bar'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/shifts/')({
  component: ShiftsPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function ShiftsPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { branchId: userBranchId } = useAuth()

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Filters
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    branch_id: userBranchId ? String(userBranchId) : '',
    device_id: '',
    status: '',
  })
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Open shift dialog
  const [openShiftOpen, setOpenShiftOpen] = useState(false)

  // Close shift dialog
  const [closeTarget, setCloseTarget] = useState<Shift | null>(null)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)

  // Data for filters
  const { data: branchesData } = useBranches({ pageSize: 100 })
  const filterBranchId = filterValues.branch_id
    ? parseInt(filterValues.branch_id, 10)
    : undefined
  const { data: devicesData } = useDevices({
    branchId: filterBranchId,
    pageSize: 100,
  })

  const branchOptions = useMemo(
    () =>
      (branchesData?.data ?? []).map((b) => ({
        value: String(b.id),
        label: b.name,
      })),
    [branchesData],
  )

  const deviceOptions = useMemo(
    () =>
      (devicesData?.data ?? []).map((d) => ({
        value: String(d.id),
        label: d.device_name,
      })),
    [devicesData],
  )

  // Build query filters
  const queryFilters = useMemo(
    () => ({
      branchId: filterValues.branch_id
        ? parseInt(filterValues.branch_id, 10)
        : undefined,
      deviceId: filterValues.device_id
        ? parseInt(filterValues.device_id, 10)
        : undefined,
      status: (filterValues.status || undefined) as
        | 'open'
        | 'closed'
        | undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page,
      pageSize,
    }),
    [filterValues, dateFrom, dateTo, page, pageSize],
  )

  const { data, isLoading } = useShifts(queryFilters)

  const columns = useMemo(
    () =>
      getShiftColumns({
        onViewDetail: (shift) =>
          navigate({
            to: '/shifts/$shiftId',
            params: { shiftId: String(shift.id) },
          }),
        onClose: (shift) => {
          setCloseTarget(shift)
          setCloseDialogOpen(true)
        },
      }),
    [navigate],
  )

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => {
      // Reset device when branch changes
      if (key === 'branch_id') return { ...prev, branch_id: value, device_id: '' }
      return { ...prev, [key]: value }
    })
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilterValues({
      branch_id: userBranchId ? String(userBranchId) : '',
      device_id: '',
      status: '',
    })
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shifts"
        description="Track cashier shifts and cash reconciliation."
        actions={
          <Button onClick={() => setOpenShiftOpen(true)}>
            <PlusIcon className="mr-2 size-4" />
            Open Shift
          </Button>
        }
      />

      <FilterBar
        filters={[
          {
            type: 'select',
            key: 'branch_id',
            label: 'Branch',
            options: branchOptions,
            allLabel: 'All branches',
          },
          {
            type: 'select',
            key: 'device_id',
            label: 'Device',
            options: deviceOptions,
            allLabel: 'All devices',
          },
          {
            type: 'select',
            key: 'status',
            label: 'Status',
            options: [
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
            ],
            allLabel: 'All statuses',
          },
        ]}
        values={filterValues}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
      >
        {/* Date range inputs */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              className="h-9 w-[140px] text-sm"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              className="h-9 w-[140px] text-sm"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
      </FilterBar>

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
        initialColumnVisibility={isMobile ? { device_name: false, branch_name: false, opening_cash: false, closing_cash: false, closed_at: false } : {}}
        emptyMessage="No shifts found."
      />

      {/* ── Open Shift Dialog ── */}
      <Dialog
        open={openShiftOpen}
        onOpenChange={(open) => {
          if (!open) setOpenShiftOpen(false)
          else setOpenShiftOpen(true)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Open New Shift</DialogTitle>
          </DialogHeader>
          <OpenShiftForm
            key={openShiftOpen ? 'open' : 'closed'}
            branchOptions={branchOptions}
            defaultBranchId={userBranchId ?? undefined}
            onSuccess={() => setOpenShiftOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Close Shift Dialog ── */}
      <Dialog
        open={closeDialogOpen}
        onOpenChange={(open) => {
          if (!open) setCloseTarget(null)
          setCloseDialogOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Close Shift #{closeTarget?.id}</DialogTitle>
          </DialogHeader>
          {closeTarget && (
            <CloseShiftForm
              key={closeTarget.id}
              shiftId={closeTarget.id}
              onSuccess={() => {
                setCloseDialogOpen(false)
                setCloseTarget(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Open Shift Form ──────────────────────────────────────────────────────────

interface OpenShiftFormProps {
  branchOptions: { value: string; label: string }[]
  defaultBranchId?: number
  onSuccess: () => void
}

function OpenShiftForm({
  branchOptions,
  defaultBranchId,
  onSuccess,
}: OpenShiftFormProps) {
  // Local state for branch selection (not part of the TanStack form)
  const [selectedBranchId, setSelectedBranchId] = useState(
    defaultBranchId ? String(defaultBranchId) : '',
  )
  const [branchError, setBranchError] = useState('')

  const openMutation = useOpenShift()

  const { data: devicesData } = useDevices({
    branchId: selectedBranchId ? parseInt(selectedBranchId, 10) : undefined,
    pageSize: 100,
  })

  const deviceOptions = useMemo(
    () =>
      (devicesData?.data ?? [])
        .filter((d) => d.status === 'active')
        .map((d) => ({ value: String(d.id), label: d.device_name })),
    [devicesData],
  )

  const form = useAppForm({
    defaultValues: {
      device_id: '',
      opening_cash: 0,
    },
    onSubmit: async ({ value }) => {
      if (!selectedBranchId) {
        setBranchError('Branch is required')
        return
      }
      await openMutation.mutateAsync({
        device_id: parseInt(value.device_id, 10),
        branch_id: parseInt(selectedBranchId, 10),
        opening_cash: Number(value.opening_cash) || 0,
      })
      onSuccess()
    },
  })

  // Reset device when branch changes
  const prevBranchRef = useRef(selectedBranchId)
  useEffect(() => {
    if (prevBranchRef.current !== selectedBranchId) {
      form.setFieldValue('device_id', '')
      prevBranchRef.current = selectedBranchId
    }
  }, [form, selectedBranchId])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!selectedBranchId) {
          setBranchError('Branch is required')
          return
        }
        form.handleSubmit()
      }}
      className="space-y-4 pb-2"
    >
      {/* Branch (plain select, not a form field) */}
      <div className="space-y-1">
        <Label htmlFor="open-branch">Branch</Label>
        <Select
          value={selectedBranchId}
          onValueChange={(v) => {
            setSelectedBranchId(v)
            setBranchError('')
          }}
        >
          <SelectTrigger id="open-branch" className="w-full">
            <SelectValue placeholder="Select a branch" />
          </SelectTrigger>
          <SelectContent>
            {branchOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {branchError && (
          <p className="text-xs text-destructive">{branchError}</p>
        )}
      </div>

      {/* Device */}
      <form.AppField
        name="device_id"
        validators={{
          onChange: ({ value }) =>
            !value ? 'Device is required' : undefined,
        }}
      >
        {(field) => (
          <field.SelectField
            label="Device"
            options={deviceOptions}
            placeholder={
              !selectedBranchId
                ? 'Select a branch first'
                : deviceOptions.length === 0
                  ? 'No active devices in this branch'
                  : 'Select a device'
            }
            disabled={!selectedBranchId || deviceOptions.length === 0}
          />
        )}
      </form.AppField>

      {/* Opening Cash */}
      <form.AppField
        name="opening_cash"
        validators={{
          onChange: ({ value }) => {
            if (Number(value) < 0) return 'Must be 0 or more'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.NumberField
            label="Opening Cash"
            prefix="Rp"
            min={0}
            step={1000}
            placeholder="0"
          />
        )}
      </form.AppField>

      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label="Open Shift"
            className="w-auto min-w-[120px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}

// ─── Close Shift Form ─────────────────────────────────────────────────────────

interface CloseShiftFormProps {
  shiftId: number
  onSuccess: () => void
}

function CloseShiftForm({ shiftId, onSuccess }: CloseShiftFormProps) {
  const closeMutation = useCloseShift()

  const form = useAppForm({
    defaultValues: {
      closing_cash: 0,
      notes: '',
    },
    onSubmit: async ({ value }) => {
      const payload: CloseShiftPayload = {
        closing_cash: Number(value.closing_cash),
        notes: value.notes?.trim() || undefined,
      }
      await closeMutation.mutateAsync({ id: shiftId, payload })
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
      {/* Closing Cash */}
      <form.AppField
        name="closing_cash"
        validators={{
          onChange: ({ value }) => {
            if (value === undefined || value === ('' as unknown as number))
              return 'Closing cash is required'
            if (Number(value) < 0) return 'Must be 0 or more'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.NumberField
            label="Closing Cash"
            prefix="Rp"
            min={0}
            step={1000}
            placeholder="0"
          />
        )}
      </form.AppField>

      {/* Notes */}
      <form.AppField name="notes">
        {(field) => (
          <field.TextareaField
            label="Notes"
            placeholder="Any notes about this shift (optional)…"
            rows={3}
          />
        )}
      </form.AppField>

      <div className="flex justify-end pt-2">
        <form.AppForm>
          <form.SubscribeButton
            label="Close Shift"
            className="w-auto min-w-[120px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}
