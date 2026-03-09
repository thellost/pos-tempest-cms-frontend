import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth-guards'
import { useAuth } from '@/hooks/use-auth'
import { useUser, useUpdateUser } from '@/hooks/use-users'
import { useBranches } from '@/hooks/use-branches'
import { useAppForm } from '@/hooks/use-form'
import {
  ROLE_OPTIONS,
  STAFF_ROLE_OPTIONS,
  type UpdateUserPayload,
} from '@/lib/services/users'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/_authenticated/users/$userId')({
  beforeLoad: requireRole(['admin', 'manager']),
  component: EditUserPage,
})

// ─── Page ─────────────────────────────────────────────────────────────────────

function EditUserPage() {
  const navigate = useNavigate()
  const { userId } = Route.useParams()
  const userIdNum = parseInt(userId, 10)

  const { data, isLoading } = useUser(userIdNum)
  const user = data?.data

  const { role: currentRole } = useAuth()
  const availableRoleOptions =
    currentRole === 'admin' ? ROLE_OPTIONS : STAFF_ROLE_OPTIONS

  return (
    <div className="space-y-6">
      <PageHeader
        title={isLoading ? 'Edit User' : `Edit "${user?.name ?? ''}"`}
        description="Update staff account details."
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
        {isLoading ? (
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : user ? (
          <div className="space-y-4">
            {/* Account details card */}
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>
                  Email cannot be changed. Use Supabase Auth to update it
                  directly if needed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EditUserForm
                  key={user.id}
                  userId={user.id}
                  defaultValues={{
                    name: user.name,
                    phone: user.phone ?? '',
                    role_id: String(user.role_id),
                    branch_id: user.branch_id,
                    avatar_url: user.avatar_url ?? '',
                    is_active: user.is_active,
                    pin_code: '',
                  }}
                  email={user.email}
                  availableRoleOptions={availableRoleOptions}
                  onSuccess={() => navigate({ to: '/users' })}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              User not found.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface EditUserFormProps {
  userId: number
  defaultValues: {
    name: string
    phone: string
    role_id: string
    branch_id: number | null
    avatar_url: string
    is_active: boolean
    pin_code: string
  }
  email: string
  availableRoleOptions: { value: string; label: string }[]
  onSuccess: () => void
}

function EditUserForm({
  userId,
  defaultValues,
  email,
  availableRoleOptions,
  onSuccess,
}: EditUserFormProps) {
  const updateMutation = useUpdateUser()
  const { data: branchesData } = useBranches({ pageSize: 100 })

  const branchOptions = (branchesData?.data ?? []).map((b) => ({
    value: b.id,
    label: b.name,
  }))

  const form = useAppForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const payload: UpdateUserPayload = {
        name: value.name.trim(),
        phone: value.phone?.trim() || null,
        role_id: parseInt(value.role_id, 10),
        branch_id:
          value.branch_id !== null && value.branch_id !== undefined
            ? Number(value.branch_id)
            : undefined,
        avatar_url: value.avatar_url?.trim() || null,
        is_active: value.is_active,
        pin_code: value.pin_code?.trim() || undefined,
      }
      await updateMutation.mutateAsync({ id: userId, payload })
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
      {/* Email — read-only */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Email</label>
        <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
          {email}
        </div>
        <p className="text-xs text-muted-foreground">
          Email address cannot be changed here.
        </p>
      </div>

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
      <form.AppField
        name="phone"
        validators={{
          onChange: ({ value }) => {
            if (value && value.length > 20) return 'Max 20 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Phone"
            placeholder="+62 812 3456 7890 (optional)"
            type="tel"
          />
        )}
      </form.AppField>

      {/* Role + Branch */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <form.AppField name="branch_id">
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

      {/* Avatar URL */}
      <form.AppField
        name="avatar_url"
        validators={{
          onChange: ({ value }) => {
            if (value && value.length > 500) return 'Max 500 characters'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.TextField
            label="Avatar URL"
            placeholder="https://… (optional)"
            type="url"
          />
        )}
      </form.AppField>

      {/* PIN Code */}
      <form.AppField
        name="pin_code"
        validators={{
          onChange: ({ value }) => {
            if (!value) return undefined // optional — blank = keep existing
            if (value.length !== 6) return 'PIN must be exactly 6 digits'
            return undefined
          },
        }}
      >
        {(field) => (
          <field.PinCodeField
            label="New PIN Code"
            description="Leave blank to keep the current PIN. Enter a new 6-digit PIN to change it."
          />
        )}
      </form.AppField>

      {/* Is Active */}
      <form.AppField name="is_active">
        {(field) => (
          <field.SwitchField
            label="Active"
            description="Inactive users cannot sign in to the system."
          />
        )}
      </form.AppField>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => form.reset()}
        >
          Reset
        </Button>
        <form.AppForm>
          <form.SubscribeButton
            label="Save Changes"
            className="w-auto min-w-[120px]"
          />
        </form.AppForm>
      </div>
    </form>
  )
}
