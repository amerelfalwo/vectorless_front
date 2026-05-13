import { FileUp, MessageSquarePlus, Loader2 } from 'lucide-react'
import { useRef } from 'react'

/**
 * @typedef {{ chatId: string, docId: string, title: string, updatedAt: number }} ChatSession
 */

/**
 * @param {{
 *   sessions: ChatSession[]
 *   activeChatId: string | null
 *   hasDocument: boolean
 *   isStreaming: boolean
 *   isUploading: boolean
 *   onBeforePickFile: () => void
 *   onFileSelected: (file: File) => void
 *   onNewChat: () => void
 *   onSelectSession: (session: ChatSession) => void
 * }} props
 */
export function Sidebar({
  sessions,
  activeChatId,
  hasDocument,
  isStreaming,
  isUploading,
  onBeforePickFile,
  onFileSelected,
  onNewChat,
  onSelectSession,
}) {
  const uploadInputRef = useRef(null)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <input
        ref={uploadInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelected(file)
          e.target.value = ''
        }}
      />

      <div className="hidden border-b border-zinc-800/80 px-4 py-4 md:block">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Vectorless RAG
        </p>
        <p className="mt-1 text-sm text-zinc-400">Ask questions over your PDFs.</p>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <button
          type="button"
          onClick={() => {
            onBeforePickFile()
            uploadInputRef.current?.click()
          }}
          disabled={isUploading}
          className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm font-medium text-zinc-100 shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <FileUp className="h-4 w-4 shrink-0" aria-hidden />
          )}
          Upload New Document
        </button>

        <button
          type="button"
          onClick={onNewChat}
          disabled={!hasDocument || isStreaming}
          className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <MessageSquarePlus className="h-4 w-4 shrink-0" aria-hidden />
          Start New Chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Recent chats
        </p>
        {sessions.length === 0 ? (
          <p className="px-2 text-sm text-zinc-500">No saved sessions yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {sessions.map((s) => {
              const active = s.chatId === activeChatId
              return (
                <li key={s.chatId}>
                  <button
                    type="button"
                    onClick={() => onSelectSession(s)}
                    className={[
                      'w-full rounded-lg px-3 py-2 text-left text-sm transition',
                      active
                        ? 'bg-zinc-800 text-white ring-1 ring-violet-500/40'
                        : 'text-zinc-300 hover:bg-zinc-800/70',
                    ].join(' ')}
                  >
                    <span className="line-clamp-2">{s.title}</span>
                    <span className="mt-0.5 block text-[11px] text-zinc-500">
                      {new Date(s.updatedAt).toLocaleString()}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
