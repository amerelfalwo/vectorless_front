import { useEffect } from 'react'
import { Sparkles, ArrowRight, X } from 'lucide-react'

/**
 * Gentle Center Notification Pill
 * Appears in the center of the screen when a background research session finishes.
 *
 * @param {{
 *   notice: { id: string, chatId: string, title: string } | null,
 *   onView: (chatId: string) => void,
 *   onDismiss: () => void,
 * }} props
 */
export function CenterNotification({ notice, onView, onDismiss }) {
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => {
      onDismiss()
    }, 7000)
    return () => clearTimeout(timer)
  }, [notice, onDismiss])

  if (!notice) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300 max-w-md w-[92vw] sm:w-auto"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-[#285943]/20 bg-white/95 backdrop-blur-md px-4 py-2.5 shadow-xl shadow-[#285943]/10 transition hover:shadow-2xl">
        {/* Pulsing Red/Green Status Indicator */}
        <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
        </div>

        {/* Notification Text */}
        <div className="flex items-center gap-1.5 min-w-0 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-[#285943] shrink-0" />
          <span className="text-[#777D76] font-medium hidden sm:inline">اكتمل البحث:</span>
          <span className="font-semibold text-[#262B27] truncate max-w-[170px] sm:max-w-[220px]">
            {notice.title || 'Research complete'}
          </span>
        </div>

        {/* Action Button: View Session */}
        <button
          type="button"
          onClick={() => {
            onView(notice.chatId)
            onDismiss()
          }}
          className="flex items-center gap-1 rounded-lg bg-[#285943] hover:bg-[#1e4533] text-white px-2.5 py-1 text-xs font-medium transition active:scale-95 shrink-0 shadow-2xs"
        >
          <span>عرض</span>
          <ArrowRight className="h-3 w-3 stroke-[2.5]" />
        </button>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="rounded-md p-1 text-[#777D76] hover:bg-[#F7F6F1] hover:text-[#262B27] transition shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
