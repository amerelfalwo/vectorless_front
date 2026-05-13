import { SendHorizontal, Square } from 'lucide-react'

/**
 * @param {{
 *   value: string
 *   onChange: (value: string) => void
 *   onSend: () => void
 *   onStop?: () => void
 *   disabled: boolean
 *   isStreaming: boolean
 * }} props
 */
export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  disabled,
  isStreaming,
}) {
  const inputLocked = disabled || isStreaming
  const canSend = !disabled && !isStreaming && value.trim().length > 0

  return (
    <div className="border-t border-zinc-800/90 bg-zinc-950/95 px-4 py-3 backdrop-blur md:px-8">
      <div className="mx-auto flex max-w-3xl items-end gap-2">
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <textarea
          id="chat-input"
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (canSend) onSend()
            }
          }}
          disabled={inputLocked}
          placeholder={
            disabled ? 'Upload a document to start chatting…' : 'Ask a question about your document…'
          }
          className="max-h-40 min-h-[44px] flex-1 resize-y rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {isStreaming && onStop ? (
          <button
            type="button"
            onClick={onStop}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-600 bg-zinc-800 px-3 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
          >
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
            Stop
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SendHorizontal className="h-4 w-4" aria-hidden />
          Send
        </button>
      </div>
    </div>
  )
}
