import { createFileRoute } from '@tanstack/react-router'

// Stub — will be replaced with full KPI dashboard in Step 5.1

export const Route = createFileRoute('/_authenticated/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to POS Tempest CMS. KPI cards coming in Step 5.1.
      </p>
    </div>
  )
}
