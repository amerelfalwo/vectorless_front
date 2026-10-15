import { memo } from 'react'
import { Check, CircleAlert, Loader2, X, FileText } from 'lucide-react'
import { formatBytes } from '../lib/activity.js'

const STATUS = {
  staged: { text: 'Attached · Sent with message', tone: 'text-[#777D76]', bg: 'bg-[#F7F6F1]' },
  uploading: { text: 'Uploading document…', tone: 'text-[#B78A45]', bg: 'bg-[#FDFBF7]', busy: true },
  indexing: { text: 'Building hierarchical index…', tone: 'text-[#B78A45]', bg: 'bg-[#FDFBF7]', busy: true },
  ready: { text: 'Index ready for research', tone: 'text-[#285943]', bg: 'bg-[#E8F0E8]' },
  error: { text: 'Indexing failed', tone: 'text-red-700', bg: 'bg-red-50' },
}

/**
 * @param {{
 *   name: string,
 *   size?: number,
 *   status: 'staged' | 'uploading' | 'indexing' | 'ready' | 'error',
 *   onRemove?: () => void,
 *   disabled?: boolean,
 *   compact?: boolean,
 * }} props
 */
export const DocumentCard = memo(function DocumentCard({
  name,
  size,
  status = 'staged',
  onRemove,
  disabled = false,
  compact = false,
}) {
  const s = STATUS[status] ?? STATUS.staged

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-2 rounded-lg border border-[#E4E5DE] bg-white px-2.5 py-1 text-xs text-[#262B27] shadow-sm"
        role="group"
        aria-label={`PDF attachment ${name}`}
      >
        <FileText className="h-3.5 w-3.5 shrink-0 text-[#285943]" aria-hidden />
        <span className="max-w-[180px] truncate font-medium text-[#262B27]">{name}</span>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Remove ${name}`}
            className="rounded p-0.5 text-[#777D76] transition hover:bg-[#F7F6F1] hover:text-[#262B27] disabled:opacity-40"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className="relative flex w-full max-w-md items-center gap-3 overflow-hidden rounded-xl border border-[#E4E5DE] bg-white px-3.5 py-2.5 shadow-sm transition hover:border-[#D0D2C7]"
      role="group"
      aria-label={`PDF attachment ${name}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E4E5DE] bg-[#F7F6F1] text-[#285943]">
        <FileText className="h-5 w-5" aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#262B27]" title={name}>
          {name}
        </p>
        <div className="flex items-center gap-2 pt-0.5 text-xs">
          {size ? <span className="text-[#777D76]">{formatBytes(size)} ·</span> : null}
          <span className={`inline-flex items-center gap-1 font-medium ${s.tone}`}>
            {s.busy ? <Loader2 className="h-3 w-3 animate-spin text-[#B78A45]" aria-hidden /> : null}
            {status === 'ready' ? <Check className="h-3 w-3 text-[#285943]" aria-hidden /> : null}
            {status === 'error' ? <CircleAlert className="h-3 w-3 text-red-600" aria-hidden /> : null}
            {s.text}
          </span>
        </div>
      </div>

      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${name}`}
          className="rounded-lg p-1 text-[#777D76] transition hover:bg-[#F7F6F1] hover:text-[#262B27] disabled:opacity-40"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}

      {s.busy ? (
        <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-[#ECEEE7]" aria-hidden>
          <span className="atlas-indeterminate block h-full w-1/3 rounded-full bg-[#285943]" />
        </span>
      ) : null}
    </div>
  )
})
