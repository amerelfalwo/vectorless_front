import { CircleAlert, RotateCcw } from 'lucide-react'

/**
 * @param {{
 *   title: string,
 *   detail?: string | null,
 *   onRetry?: () => void,
 *   retryLabel?: string,
 *   disabled?: boolean,
 *   tone?: 'error' | 'neutral'
 * }} props
 */
export function ErrorState({
  title,
  detail,
  onRetry,
  retryLabel = 'Retry',
  disabled = false,
  tone = 'error',
}) {
  const isError = tone === 'error'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border p-3 text-xs shadow-xs transition ${
        isError
          ? 'border-red-200 bg-red-50/70 text-red-900'
          : 'border-[#E4E5DE] bg-[#F7F6F1] text-[#262B27]'
      }`}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <CircleAlert
          className={`h-4 w-4 shrink-0 mt-0.5 ${
            isError ? 'text-red-700' : 'text-[#777D76]'
          }`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm leading-tight">{title}</p>
          {detail ? (
            <p className="mt-1 break-words text-xs text-[#555B54]">{detail}</p>
          ) : null}
        </div>
      </div>

      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={disabled}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#E4E5DE] bg-white px-2.5 py-1.5 text-xs font-medium text-[#262B27] shadow-xs transition hover:bg-[#F7F6F1] hover:border-[#D0D2C7] active:scale-95 disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5 text-[#285943]" aria-hidden />
          <span>{retryLabel}</span>
        </button>
      ) : null}
    </div>
  )
}
