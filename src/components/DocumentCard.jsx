import { memo } from 'react'
import { Check, CircleAlert, Loader2, X } from 'lucide-react'
import { formatBytes } from '../lib/activity.js'

const STATUS = {
  staged: { text: 'Attached · sent with your next message', tone: 'text-zinc-400' },
  uploading: { text: 'Uploading document…', tone: 'text-sky-300', busy: true },
  indexing: { text: 'Indexing document…', tone: 'text-sky-300', busy: true },
  ready: { text: 'Document ready', tone: 'text-emerald-400' },
  error: { text: 'Upload failed', tone: 'text-red-400' },
}

/**
 * @param {{
 *   name: string,
 *   size?: number,
 *   status: 'staged' | 'uploading' | 'indexing' | 'ready' | 'error',
 *   onRemove?: () => void,
 *   disabled?: boolean,
 * }} props
 */
export const DocumentCard = memo(function DocumentCard({ name, size, status, onRemove, disabled }) {
  const s = STATUS[status] ?? STATUS.staged

  return (
    <div
      className="relative flex w-full max-w-sm items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] px-3 py-2.5"
      role="group"
      aria-label={`PDF attachment ${name}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-[10px] font-bold tracking-wide text-red-300">
        PDF
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100" title={name}>
          {name}
        </p>
        <p className={`flex items-center gap-1.5 text-xs ${s.tone}`}>
          {size ? <span className="text-zinc-500">{formatBytes(size)} ·</span> : null}
          {s.busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
          {status === 'ready' ? <Check className="h-3 w-3" aria-hidden /> : null}
          {status === 'error' ? <CircleAlert className="h-3 w-3" aria-hidden /> : null}
          <span>{s.text}</span>
        </p>
      </div>

      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Remove ${name}`}
          className="rounded-full p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}

      {s.busy ? (
        <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-white/5" aria-hidden>
          <span className="vl-indeterminate block h-full w-1/3 rounded-full bg-sky-400/70" />
        </span>
      ) : null}
    </div>
  )
})
