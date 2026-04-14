import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth-guards'
import { useAuth } from '@/hooks/use-auth'
import { useCreateUser } from '@/hooks/use-users'
import { useBranches } from '@/hooks/use-branches'
import { useAppForm } from '@/hooks/use-form'
import { phoneValidators } from '@/components/form-fields'
import {
  ROLE_OPTIONS,
  STAFF_ROLE_OPTIONS,
  type CreateUserPayload,
} from '@/lib/services/users'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/users/create')({
  beforeLoad: requireRole(['admin', 'manager', 'cashier']),
  component: CreateUserPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function CreateUserPage() {
  const navigate = useNavigate()
  const { role } = useAuth()

  // Managers can only assign staff roles (cashier, chef, waiter)
  const availableRoleOptions =
    role === 'admin' ? ROLE_OPTIONS : STAFF_ROLE_OPTIONS

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add User"
        description="Create a new staff account. An email invitation will be sent via Supabase Auth."
        actions={
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/users' })}
          >
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to Users
          </Button>
        }
      />

      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateUserForm
              availableRoleOptions={availableRoleOptions}
              onSuccess={() => navigate({ to: '/users' })}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface CreateUserFormProps {
  availableRoleOptions: { value: string; label: string }[]
  onSuccess: () => void
}

function CreateUserForm({ availableRoleOptions, onSuccess }: CreateUserFormProps) {
  const createMutation = useCreateUser()
  const { data: branchesData } = useBranches({ pageSize: 100 })

  const branchOptions = (branchesData?.data ?? []).map((b) => ({
    value: b.id,
    label: b.name,
  }))

  const form = useAppForm({
    defaultValues: {
      email: '',
      password: '',
      name: '',
      phone: '',
      role_id: '',
      branch_id: null as number | null,
      pin_code: '',
    },
    onSubmit: async ({ value }) => {
      const payload: CreateUserPayload = {
        email: value.email.trim(),
        password: value.password,
        name: value.name.trim(),
        role_id: parseInt(value.role_id, 10),
        branch_id: value.branch_id as number,
        phone: value.phone?.trim() || undefined,
        pin_code: value.pin_code?.trim() || undefined,
      }
      await createMutation.mutateAsync(payload)
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
      className="space-y-4"
    >
      {/* Email */}
      <form.AppField
        name="email"
        validators={{
          onChange: ({ value }) => {
            if (!value?.trim()) return 'Email is required'
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
              return 'Must be a valid email address'
            if (value.length > 255) return 'Max 255 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Email"
            placeholder="staff@restaurant.com"
            type="email"
          />
        )}
      </form.AppField>

      {/* Password */}
      <form.AppField
        name="password"
        validators={{
          onChange: ({ value }) => {
            if (!value?.trim()) return 'Password is required'
            if (value.length < 8) return 'Minimum 8 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.PasswordField
            label="Password"
            placeholder="Minimum 8 characters"
          />
        )}
      </form.AppField>

      {/* Name */}
      <form.AppField
        name="name"
        validators={{
          onChange: ({ value }) => {
            if (!value?.trim()) return 'Name is required'
            if (value.length > 100) return 'Max 100 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField label="Full Name" placeholder="e.g. John Doe" />
        )}
      </form.AppField>

      {/* Phone */}
      <form.AppField name="phone" validators={phoneValidators}>
        {(field) => <field.PhoneField placeholder="+62 812 3456 7890 (optional)" />}
      </form.AppField>

      {/* Role + Branch */}
      <div className="form-grid-mobile form-grid-mobile-2">
        <form.AppField
          name="role_id"
          validators={{
            onChange: ({ value }) =>
              !value ? 'Role is required' : undefined,
          }}
        >
          {(field) => (
            <field.SelectField
              label="Role"
              placeholder="Select role"
              options={availableRoleOptions}
            />
          )}
        </form.AppField>

        <form.AppField
          name="branch_id"
          validators={{
            onChange: ({ value }) =>
              value === null || value === undefined
                ? 'Branch is required'
                : undefined,
          }}
        >
          {(field) => (
            <field.ComboboxField
              label="Branch"
              options={branchOptions}
              placeholder="Select branch"
              searchPlaceholder="Search branches…"
              emptyMessage="No branches found."
            />
          )}
        </form.AppField>
      </div>

      {/* PIN Code */}
      <form.AppField
        name="pin_code"
        validators={{
          onChange: ({ value }) => {
            if (!value) return undefined // optional
            if (value.length !== 6) return 'PIN must be exactly 6 digits'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.PinCodeField
            label="PIN Code"
            description="6-digit PIN for quick POS terminal access (optional)."
          />
        )}
      </form.AppField>

      {/* Submit */}
      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => form.reset()}
        >
          Reset
        </Button>
        <form.AppForm>
          <form.SubscribeButton
            label="Create User"
            className="w-full min-w-[120px] sm:w-auto"
          />
        </form.AppForm>
      </div>
    </form>
  )
}
