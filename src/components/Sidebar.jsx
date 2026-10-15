import { useMemo, useState, useRef, useEffect } from 'react'
import {
  Plus,
  Search,
  MessageSquare,
  FileText,
  Trash2,
  Pencil,
  Check,
  X,
  BookOpen,
  PanelLeftClose,
  Brain,
  ChevronDown,
  FolderTree,
  Paperclip,
} from 'lucide-react'

import { AtlasLogo } from './AtlasLogo.jsx'
import { PRODUCT_CONFIG } from '../config/product.js'

/**
 * Helper to group sessions by date
 */
function groupSessionsByDate(sessions) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000
  const sevenDaysAgo = todayStart - 6 * 86400000

  const groups = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: [],
  }

  for (const s of sessions) {
    const time = s.updatedAt || 0
    if (time >= todayStart) {
      groups.today.push(s)
    } else if (time >= yesterdayStart) {
      groups.yesterday.push(s)
    } else if (time >= sevenDaysAgo) {
      groups.previous7Days.push(s)
    } else {
      groups.older.push(s)
    }
  }

  return [
    { title: 'Today', items: groups.today },
    { title: 'Yesterday', items: groups.yesterday },
    { title: 'Previous 7 Days', items: groups.previous7Days },
    { title: 'Older', items: groups.older },
  ].filter((g) => g.items.length > 0)
}

/**
 * Comprehensive Atlas Sidebar
 * Houses the Brand, Primary Navigation Tabs, Session Attached Documents,
 * and Persistent Conversation History.
 */
export function Sidebar({
  sessions = [],
  activeChatId,
  isStreaming = false,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onCloseSidebar,
  currentView = 'chat',
  onNavigate,
  attachedDocs = [],
  availableDocs = [],
  onAttachDoc,
  onDetachDoc,
  onToggleStructureExplorer,
  structureExplorerOpen = false,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingChatId, setEditingChatId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [attachDropdownOpen, setAttachDropdownOpen] = useState(false)
  const attachDropdownRef = useRef(null)

  // Close attach dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (attachDropdownRef.current && !attachDropdownRef.current.contains(event.target)) {
        setAttachDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filtered by search
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) =>
      (s.title || '').toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [sessions, searchQuery])

  // Grouped by date
  const groupedSessions = useMemo(() => {
    return groupSessionsByDate(filteredSessions)
  }, [filteredSessions])

  // Filter available docs to those not attached yet
  const unattachedDocs = useMemo(() => {
    return (availableDocs || []).filter(
      (d) => !attachedDocs.some((ad) => ad.doc_id === d.doc_id),
    )
  }, [availableDocs, attachedDocs])

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
    <nav
      className="flex h-full min-h-0 flex-col bg-white text-[#262B27] select-none border-r border-[#E4E5DE]"
      aria-label="Atlas workspace navigation"
    >
      {/* 1. Brand Header with Title & Collapse Toggle Button */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-[#E4E5DE]">
        <button
          type="button"
          onClick={() => {
            onNavigate?.('chat')
            onNewChat()
          }}
          className="flex items-center gap-2.5 text-left transition hover:opacity-90"
        >
          <AtlasLogo className="h-8 w-8" showText={true} showTagline={true} />
        </button>

        {onCloseSidebar ? (
          <button
            type="button"
            onClick={onCloseSidebar}
            title="Collapse sidebar"
            className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-[#777D76] transition hover:bg-[#F7F6F1] hover:text-[#262B27]"
          >
            <PanelLeftClose className="h-4.5 w-4.5" />
          </button>
        ) : null}
      </div>

      {/* 2. Primary Navigation Tabs */}
      <div className="flex flex-col gap-1 p-3 border-b border-[#E4E5DE]">
        <button
          type="button"
          onClick={() => onNavigate?.('chat')}
          className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
            currentView === 'chat'
              ? 'bg-[#E8F0E8] text-[#285943]'
              : 'text-[#777D76] hover:bg-[#F7F6F1] hover:text-[#262B27]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="font-medium">Research Workspace</span>
          </div>
          {currentView === 'chat' && (
            <span className="h-1.5 w-1.5 rounded-full bg-[#285943]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('documents')}
          className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
            currentView === 'documents'
              ? 'bg-[#E8F0E8] text-[#285943]'
              : 'text-[#777D76] hover:bg-[#F7F6F1] hover:text-[#262B27]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="font-medium">Document Library</span>
          </div>
          {currentView === 'documents' && (
            <span className="h-1.5 w-1.5 rounded-full bg-[#285943]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onNavigate?.('knowledge')}
          className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
            currentView === 'knowledge'
              ? 'bg-[#E8F0E8] text-[#285943]'
              : 'text-[#777D76] hover:bg-[#F7F6F1] hover:text-[#262B27]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Brain className="h-4 w-4 shrink-0 text-[#8DAA91]" />
            <span className="font-medium">Collective Knowledge</span>
          </div>
          {currentView === 'knowledge' && (
            <span className="h-1.5 w-1.5 rounded-full bg-[#285943]" />
          )}
        </button>
      </div>

      {/* 3. Session Attached Documents Section (Shown in Research Workspace) */}
      {currentView === 'chat' && (
        <div className="p-3 border-b border-[#E4E5DE] space-y-2 bg-[#F7F6F1]/50">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#777D76]">
            <div className="flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              <span>Attached Documents ({attachedDocs.length})</span>
            </div>

            {/* Structure Explorer Toggle Button */}
            {onToggleStructureExplorer && attachedDocs.length > 0 && (
              <button
                type="button"
                onClick={onToggleStructureExplorer}
                title={structureExplorerOpen ? 'Hide outline tree' : 'Explore outline tree'}
                className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition ${
                  structureExplorerOpen
                    ? 'bg-[#285943] text-white'
                    : 'text-[#285943] bg-[#E8F0E8] hover:bg-[#285943] hover:text-white'
                }`}
              >
                <FolderTree className="h-2.5 w-2.5" />
                <span>Tree</span>
              </button>
            )}
          </div>

          {/* Attached Document Pills List */}
          {attachedDocs.length > 0 ? (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {attachedDocs.map((doc) => (
                <div
                  key={doc.doc_id}
                  className="flex items-center justify-between gap-1.5 rounded-lg border border-[#E4E5DE] bg-white px-2.5 py-1 text-xs shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="h-3 w-3 shrink-0 text-[#285943]" />
                    <span className="truncate text-xs font-medium text-[#262B27] max-w-[170px]">
                      {doc.filename || 'Document'}
                    </span>
                  </div>

                  {onDetachDoc && (
                    <button
                      type="button"
                      onClick={() => onDetachDoc(doc.doc_id)}
                      title="Detach document"
                      className="rounded p-0.5 text-[#777D76] hover:bg-red-50 hover:text-red-700 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[#777D76] italic">
              No documents attached. You can chat freely or attach PDFs.
            </p>
          )}

          {/* "+ Attach from Library" Dropdown */}
          {onAttachDoc && unattachedDocs.length > 0 && (
            <div className="relative pt-1" ref={attachDropdownRef}>
              <button
                type="button"
                onClick={() => setAttachDropdownOpen((prev) => !prev)}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-dashed border-[#8DAA91] bg-white px-2.5 py-1.5 text-xs font-medium text-[#285943] transition hover:bg-[#E8F0E8]"
              >
                <Plus className="h-3 w-3" />
                <span>Attach from Library</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {attachDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 rounded-xl border border-[#E4E5DE] bg-white py-1.5 shadow-lg z-50">
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#777D76] border-b border-[#E4E5DE]/60">
                    Ready Documents
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {unattachedDocs.map((d) => (
                      <button
                        key={d.doc_id}
                        type="button"
                        onClick={() => {
                          onAttachDoc(d)
                          setAttachDropdownOpen(false)
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs text-[#262B27] hover:bg-[#F7F6F1] transition"
                      >
                        <FileText className="h-3 w-3 text-[#285943] shrink-0" />
                        <span className="truncate flex-1 font-medium">{d.filename}</span>
                        {d.page_count ? (
                          <span className="text-[10px] text-[#777D76]">{d.page_count}p</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Action: Prominent New Research Chat Button */}
      <div className="p-3 border-b border-[#E4E5DE]">
        <button
          type="button"
          onClick={() => {
            onNavigate?.('chat')
            onNewChat()
          }}
          disabled={isStreaming}
          className="flex items-center justify-between w-full rounded-xl bg-[#285943] hover:bg-[#1e4533] px-3.5 py-2 text-sm font-medium text-white transition active:scale-[0.98] shadow-sm disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>New Research</span>
          </div>
          <span className="text-[11px] font-mono opacity-80">⌘N</span>
        </button>

        {/* Search Conversations Input */}
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#777D76]" />
          <input
            id="sidebar-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-lg border border-[#E4E5DE] bg-[#F7F6F1] pl-8 pr-3 py-1.5 text-xs text-[#262B27] placeholder:text-[#777D76] focus:border-[#285943] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* 5. Scrollable Conversation History */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-[#777D76]">
            {searchQuery ? 'No matching conversations' : 'No research sessions yet'}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedSessions.map((group) => (
              <div key={group.title} className="space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#777D76]">
                  {group.title}
                </div>

                <ul className="space-y-0.5">
                  {group.items.map((s) => {
                    const active = s.chatId === activeChatId && currentView === 'chat'
                    const isEditing = editingChatId === s.chatId

                    if (isEditing) {
                      return (
                        <li key={s.chatId} className="px-1 py-0.5">
                          <div className="flex items-center gap-1 rounded-lg border border-[#285943] bg-white p-1">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(s.chatId)
                                if (e.key === 'Escape') handleCancelRename()
                              }}
                              autoFocus
                              className="w-full bg-transparent px-1.5 text-xs text-[#262B27] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRename(s.chatId)}
                              className="text-[#285943] hover:opacity-80 p-0.5"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelRename}
                              className="text-[#777D76] hover:opacity-80 p-0.5"
                            >
                              <X className="h-3 w-3" />
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
                              ? 'bg-[#E8F0E8] text-[#285943] font-medium shadow-2xs'
                              : 'text-[#262B27] hover:bg-[#F7F6F1]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onNavigate?.('chat')
                              onSelectSession(s)
                            }}
                            className="flex items-center gap-2 min-w-0 flex-1 text-left"
                          >
                            {s.docId ? (
                              <FileText
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  active ? 'text-[#285943]' : 'text-[#8DAA91]'
                                }`}
                              />
                            ) : (
                              <MessageSquare
                                className={`h-3.5 w-3.5 shrink-0 ${
                                  active ? 'text-[#285943]' : 'text-[#777D76]'
                                }`}
                              />
                            )}
                            <span className="truncate max-w-[150px]">
                              {s.title || 'Untitled conversation'}
                            </span>
                          </button>

                          {/* Hover Actions: Rename & Delete */}
                          <div
                            className={`flex items-center gap-0.5 transition-opacity ${
                              active
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStartRename(s)
                              }}
                              title="Rename conversation"
                              className="flex h-6 w-6 items-center justify-center rounded text-[#777D76] hover:bg-white hover:text-[#262B27] transition"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>

                            {onDeleteSession && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDeleteSession(s.chatId)
                                }}
                                title="Delete conversation"
                                className="flex h-6 w-6 items-center justify-center rounded text-[#777D76] hover:bg-red-50 hover:text-red-600 transition"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Sidebar Footer */}
      <div className="border-t border-[#E4E5DE] p-3 text-xs bg-[#F7F6F1]">
        <div className="flex items-center justify-between text-[#777D76]">
          <span className="font-serif font-medium text-[#262B27] text-xs">
            {PRODUCT_CONFIG.technology}
          </span>
          <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-[#E4E5DE]">
            v{PRODUCT_CONFIG.version}
          </span>
        </div>
      </div>
    </nav>
  )
}
