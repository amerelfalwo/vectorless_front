import { useState } from 'react'
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  FileText,
  PanelLeftClose,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import { VectorlessLogo } from './VectorlessLogo.jsx'

/**
 * @typedef {{ chatId: string, docId: string, title: string, updatedAt: number }} ChatSession
 */

/**
 * @param {{
 *   sessions: ChatSession[]
 *   activeChatId: string | null
 *   isStreaming: boolean
 *   onNewChat: () => void
 *   onSelectSession: (session: ChatSession) => void
 *   onDeleteSession?: (chatId: string) => void
 *   onRenameSession?: (chatId: string, newTitle: string) => void
 *   onCloseSidebar?: () => void
 * }} props
 */
export function Sidebar({
  sessions,
  activeChatId,
  isStreaming,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onCloseSidebar,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingChatId, setEditingChatId] = useState(null)
  const [editTitle, setEditTitle] = useState('')

  const filteredSessions = sessions.filter((s) =>
    (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleStartRename = (s) => {
    setEditingChatId(s.chatId)
    setEditTitle(s.title || '')
  }

  const handleSaveRename = (chatId) => {
    if (onRenameSession && editTitle.trim()) {
      onRenameSession(chatId, editTitle.trim())
    }
    setEditingChatId(null)
  }

  const handleCancelRename = () => {
    setEditingChatId(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#171717] text-[#ececec] select-none border-r border-white/5">
      {/* Sidebar Header with Brand Logo & Collapse Toggle */}
      <div className="flex items-center justify-between px-3 pt-3.5 pb-2">
        <div className="flex items-center gap-2.5">
          <VectorlessLogo className="h-6 w-6" />
          <span className="text-sm font-semibold tracking-wide text-white">
            Vectorless RAG
          </span>
        </div>

        {onCloseSidebar ? (
          <button
            type="button"
            onClick={onCloseSidebar}
            title="Collapse sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Top Action Buttons */}
      <div className="flex flex-col gap-2 p-3">
        {/* New Chat Button */}
        <button
          type="button"
          onClick={onNewChat}
          disabled={isStreaming}
          className="flex items-center justify-between w-full rounded-xl bg-white/5 hover:bg-white/10 px-3 py-2 text-sm font-normal text-white transition active:scale-[0.98] border border-white/5 disabled:opacity-40"
        >
          <div className="flex items-center gap-2.5">
            <Plus className="h-4 w-4 text-zinc-300" />
            <span>New chat</span>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">⌘N</span>
        </button>

        {/* Search Input */}
        <div className="relative mt-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            id="sidebar-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full rounded-lg bg-[#212121] pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
        <p className="px-3 pt-2 pb-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
          Recent chats
        </p>

        {filteredSessions.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-zinc-500">
            {searchQuery ? 'No matching chats' : 'No saved chats yet'}
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {filteredSessions.map((s) => {
              const active = s.chatId === activeChatId
              const isEditing = editingChatId === s.chatId

              if (isEditing) {
                return (
                  <li key={s.chatId} className="px-1 py-0.5">
                    <div className="flex items-center gap-1.5 w-full rounded-lg bg-[#262626] px-2 py-1.5 ring-1 ring-emerald-500/50">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(s.chatId)
                          if (e.key === 'Escape') handleCancelRename()
                        }}
                        autoFocus
                        className="min-w-0 flex-1 bg-transparent text-xs text-white placeholder:text-zinc-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(s.chatId)}
                        title="Save rename"
                        className="flex h-5 w-5 items-center justify-center rounded text-emerald-400 hover:bg-emerald-500/20"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRename}
                        title="Cancel"
                        className="flex h-5 w-5 items-center justify-center rounded text-zinc-400 hover:bg-white/10 hover:text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                )
              }

              return (
                <li key={s.chatId} className="group relative">
                  <div
                    className={`flex items-center justify-between w-full rounded-lg px-2.5 py-2 text-left text-xs transition ${
                      active
                        ? 'bg-[#212121] text-white font-medium ring-1 ring-white/10'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                    }`}
                  >
                    {/* Session click button */}
                    <button
                      type="button"
                      onClick={() => onSelectSession(s)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left"
                    >
                      {s.docId ? (
                        <FileText className="h-3.5 w-3.5 shrink-0 text-red-400" />
                      ) : (
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-zinc-500 group-hover:text-zinc-300" />
                      )}
                      <span className="truncate max-w-[145px]">
                        {s.title || 'Untitled chat'}
                      </span>
                    </button>

                    {/* Actions: Edit name & Delete chat buttons */}
                    <div
                      className={`flex items-center gap-0.5 transition-opacity ${
                        active
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                      }`}
                    >
                      {/* Rename Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartRename(s)
                        }}
                        title="Edit chat name"
                        className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-white/10 hover:text-white transition"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>

                      {/* Delete Button */}
                      {onDeleteSession ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteSession(s.chatId)
                          }}
                          title="Delete chat"
                          className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-white/10 hover:text-red-400 transition"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-white/5 p-3 text-[11px] text-zinc-500">
        <div className="flex items-center justify-between">
          <span className="font-medium text-zinc-400">Vectorless RAG</span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
            Qwen 2.5 + Llama 3.1
          </span>
        </div>
      </div>
    </div>
  )
}
