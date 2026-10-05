import { CircleAlert, RotateCcw } from 'lucide-react'

/**
 * @param {{ title: string, detail?: string | null, onRetry?: () => void, retryLabel?: string, disabled?: boolean, tone?: 'error' | 'neutral' }} props
 */
export function ErrorState({ title, detail, onRetry, retryLabel = 'Retry', disabled, tone = 'error' }) {
  const isError = tone === 'error'
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2 text-xs ${
        isError
          ? 'border-red-500/20 bg-red-500/5 text-red-300'
          : 'border-white/10 bg-white/[0.03] text-zinc-400'
      }`}
    >
      <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {detail ? <p className="mt-0.5 break-words text-[11px] opacity-80">{detail}</p> : null}
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={disabled}
          className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-zinc-200 transition hover:bg-white/10 disabled:opacity-40"
        >
          <RotateCcw className="h-3 w-3" aria-hidden />
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}
