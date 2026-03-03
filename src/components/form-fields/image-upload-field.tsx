import { useRef, useState } from 'react'
import { ImageIcon, Loader2Icon, XIcon } from 'lucide-react'
import { useFieldContext } from '@/hooks/form-context'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { FieldErrors } from './_field-errors'

interface ImageUploadFieldProps {
  label: string
  /** Supabase Storage bucket name */
  bucket?: string
  description?: string
  disabled?: boolean
  accept?: string
}

export function ImageUploadField({
  label,
  bucket = 'menu-images',
  description,
  disabled,
  accept = 'image/*',
}: ImageUploadFieldProps) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.errors
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentUrl = field.state.value

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true })

      if (uploadErr) throw uploadErr

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(fileName)

      field.handleChange(publicUrl)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Upload failed. Please try again.'
      setUploadError(message)
    } finally {
      setIsUploading(false)
      // Reset input so the same file can be re-selected after removal
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = () => {
    field.handleChange('')
    setUploadError(null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>

      {currentUrl ? (
        <div className="relative inline-block w-fit">
          <img
            src={currentUrl}
            alt="Uploaded preview"
            className="h-32 w-32 rounded-md border object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            disabled={disabled}
            className="absolute -right-2 -top-2 size-6"
            onClick={handleRemove}
            aria-label="Remove image"
          >
            <XIcon className="size-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-input bg-muted/30 text-muted-foreground transition-colors hover:border-ring hover:bg-muted/50',
            (disabled || isUploading) && 'cursor-not-allowed opacity-50',
            errors.length > 0 && 'border-destructive',
          )}
        >
          {isUploading ? (
            <Loader2Icon className="size-6 animate-spin" />
          ) : (
            <ImageIcon className="size-6" />
          )}
          <span className="text-xs">
            {isUploading ? 'Uploading…' : 'Upload image'}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {uploadError && (
        <p className="mt-1 text-xs text-destructive">{uploadError}</p>
      )}
      <FieldErrors errors={errors} />
    </div>
  )
}
