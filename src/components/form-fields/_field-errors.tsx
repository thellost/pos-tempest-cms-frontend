/**
 * Renders validation error messages for a form field.
 * Compatible with TanStack Form v1 error shapes (string | { message: string }).
 */
export function FieldErrors({ errors }: { errors: unknown[] }) {
  if (!errors.length) return null

  return (
    <>
      {errors.map((error, i) => (
        <p key={i} className="mt-1 text-xs text-destructive">
          {typeof error === 'string'
            ? error
            : typeof error === 'object' &&
                error !== null &&
                'message' in error
              ? String((error as { message: unknown }).message)
              : 'Invalid value'}
        </p>
      ))}
    </>
  )
}
