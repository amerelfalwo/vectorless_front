import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FileText, X } from 'lucide-react'
import {
  createChat,
  fetchChatHistory,
  streamAsk,
  uploadDocument,
  fetchDocumentStatus,
  retryDocumentIndexing,
  attachDocumentToChat,
  detachDocumentFromChat,
  listChats,
  deleteChat,
  renameChat,
} from './api/client.js'
import { ChatLayout } from './components/ChatLayout.jsx'
import { ChatInput } from './components/ChatInput.jsx'
import { EmptyState } from './components/EmptyState.jsx'
import { MessageList } from './components/MessageList.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import {
  loadSessions,
  patchSession,
  upsertSession,
  deleteSession,
} from './lib/sessionsStorage.js'
import {
  AGENT_STATUS_TEXT,
  STEP,
  activateStep,
  updateStep,
  completeStep,
  createSteps,
  failActive,
} from './lib/activity.js'

/**
 * Single source of truth for what the agent is doing.
 * @typedef {import('./lib/activity.js').AgentStatus} AgentStatus
 */
const BUSY_STATUSES = new Set(['uploading', 'indexing', 'retrieving', 'generating', 'streaming'])

function mapHistoryToMessages(history) {
  // History rows carry no activity data, so they render as plain completed messages.
  return (history ?? [])
    .filter((row) => row.role !== 'system')
    .map((row) => ({
      id: crypto.randomUUID(),
      role: row.role === 'user' ? 'user' : 'assistant',
      content: row.content ?? '',
      status: 'completed',
    }))
}

function patchById(list, id, fn) {
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i].id === id) {
      const next = list.slice()
      next[i] = fn(list[i])
      return next
    }
  }
  return list
}

function errorMessage(e) {
  const detail = e?.response?.data?.detail
  if (typeof detail === 'string') return detail
  const raw = e instanceof Error ? e.message : String(e ?? '')
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed?.detail === 'string') return parsed.detail
  } catch {
    /* not JSON */
  }
  return raw || 'Something went wrong.'
}

const isAbort = (e) =>
  (e instanceof DOMException && e.name === 'AbortError') ||
  e?.code === 'ERR_CANCELED' ||
  e?.name === 'CanceledError'

export default function App() {
  const [docId, setDocId] = useState(null)
  const [docName, setDocName] = useState(null)
  const [chatId, setChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [sessions, setSessions] = useState(() => loadSessions())
  const [sessionsLoaded, setSessionsLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [attachedFile, setAttachedFile] = useState(null)
  /** @type {[AgentStatus, (s: AgentStatus) => void]} */
  const [agentStatus, setAgentStatus] = useState('idle')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const busy = BUSY_STATUSES.has(agentStatus)

  const streamAbortRef = useRef(null)
  // Mirrors docId/docName so async turn code never reads stale closures.
  const docRef = useRef({ id: null, name: null })
  // Per-assistant-message retry info (File objects are not serializable, so a ref).
  const turnsRef = useRef(new Map())
  // Token batching: chunks are appended in one state update per animation frame.
  const bufferRef = useRef({ id: null, text: '', raf: 0 })

  const applyDoc = useCallback((id, name) => {
    docRef.current = { id, name }
    setDocId(id)
    setDocName(name)
  }, [])

  const flushNow = useCallback(() => {
    const buf = bufferRef.current
    if (buf.raf) {
      cancelAnimationFrame(buf.raf)
      buf.raf = 0
    }
    if (!buf.text || !buf.id) return
    const { id, text } = buf
    buf.text = ''
    setMessages((prev) =>
      patchById(prev, id, (m) => ({ ...m, content: (m.content ?? '') + text })),
    )
  }, [])

  useEffect(
    () => () => {
      const buf = bufferRef.current
      if (buf.raf) cancelAnimationFrame(buf.raf)
      streamAbortRef.current?.abort()
    },
    [],
  )

  // Load persisted chat sessions from backend on startup
  useEffect(() => {
    listChats()
      .then(({ chats }) => {
        if (!chats || chats.length === 0) return
        const mapped = chats.map((c) => ({
          chatId: c.chat_id,
          docId: c.doc_id || null,
          docName: c.doc_name || null,
          title: c.title || 'New chat',
          updatedAt: Math.round((c.updated_at || Date.now() / 1000) * 1000),
        }))
        setSessions(mapped)
        mapped.forEach((s) => upsertSession(s)) // sync to localStorage too
      })
      .catch((e) => console.warn('Could not load sessions from backend:', e))
      .finally(() => setSessionsLoaded(true))
  }, [])

  // Select file from input (keeps file staged until user presses Send)
  const handleSelectFile = useCallback((file) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a valid PDF file.')
      return
    }
    setAttachedFile(file)
  }, [])

  const handleRemoveFile = useCallback(() => {
    setAttachedFile(null)
  }, [])

  const handleNewChat = useCallback(async () => {
    if (BUSY_STATUSES.has(agentStatus)) return
    setInput('')
    setAttachedFile(null)
    applyDoc(null, null)
    setMessages([])
    setAgentStatus('idle')

    try {
      const { chat_id } = await createChat()
      setChatId(chat_id)
      setSessions(
        upsertSession({
          chatId: chat_id,
          docId: null,
          title: 'New chat',
          updatedAt: Date.now(),
        }),
      )
      setMobileSidebarOpen(false)
    } catch (e) {
      console.error(e)
      toast.error('Failed to start new chat.')
    }
  }, [agentStatus, applyDoc])

  const handleSelectSession = useCallback(
    async (session) => {
      streamAbortRef.current?.abort()
      streamAbortRef.current = null
      applyDoc(session.docId || null, session.docName || null)
      setAgentStatus(session.docId ? 'ready' : 'idle')
      setChatId(session.chatId)
      setInput('')
      setAttachedFile(null)
      setMobileSidebarOpen(false)
      try {
        const data = await fetchChatHistory(session.chatId)
        setMessages(mapHistoryToMessages(data.history))

        if (session.docId) {
          fetchDocumentStatus(session.docId)
            .then((docMeta) => {
              if (docMeta.status === 'indexing') {
                setAgentStatus('indexing')
                pollDocumentUntilReady(session.docId)
                  .then(() => setAgentStatus('ready'))
                  .catch(() => setAgentStatus('error'))
              } else if (docMeta.status === 'ready') {
                setAgentStatus('ready')
              } else if (docMeta.status === 'failed') {
                setAgentStatus('error')
              }
            })
            .catch(() => {})
        }
      } catch (e) {
        console.error(e)
        setMessages([])
        toast.error('Failed to load chat history.')
      }
    },
    [applyDoc],
  )

  const handleStop = useCallback(() => {
    // The AbortError path in processTurn marks the message "stopped" and keeps partial text.
    streamAbortRef.current?.abort()
  }, [])

  /**
   * Polls GET /documents/{docId}/status until status is 'ready' or 'failed'.
   * Updates operational progress during polling.
   */
  const pollDocumentUntilReady = useCallback(
    async (docId, { signal, onProgress, intervalMs = 1500 } = {}) => {
      while (!signal?.aborted) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs))
        if (signal?.aborted) break

        try {
          const data = await fetchDocumentStatus(docId, { signal })
          onProgress?.(data)

          if (data.status === 'ready') {
            return data
          }
          if (data.status === 'failed') {
            throw new Error(data.error || 'Document indexing failed')
          }
        } catch (err) {
          if (signal?.aborted) throw err
          if (err.response?.status === 404) {
            continue
          }
          if (err.message && !err.isAxiosError) {
            throw err
          }
          console.warn('Transient status polling error:', err)
        }
      }
      if (signal?.aborted) {
        const abortErr = new Error('Polling aborted')
        abortErr.name = 'AbortError'
        throw abortErr
      }
    },
    [],
  )

  /**
   * One assistant turn: optional upload+index, then the streamed /ask.
   * Every status/step change below is triggered by a real event
   * (bytes sent, response received, first token, stream end, abort, error).
   */
  const processTurn = useCallback(
    async ({ assistantId, userId, entry, chatId: cid }) => {
      const controller = new AbortController()
      streamAbortRef.current = controller
      const { signal } = controller

      const patchAssistant = (fn) => setMessages((prev) => patchById(prev, assistantId, fn))
      const patchUser = (fn) => {
        if (userId) setMessages((prev) => patchById(prev, userId, fn))
      }
      const steps = (op) => patchAssistant((m) => ({ ...m, steps: op(m.steps ?? []) }))

      bufferRef.current = { id: assistantId, text: '', raf: 0 }
      let phase = entry.file ? 'upload' : 'ask'
      let gotFirst = false

      try {
        // ---- A. Upload + index (only when a PDF travels with this prompt) ----
        if (entry.file) {
          const file = entry.file
          setAgentStatus('uploading')
          steps((s) => activateStep(s, STEP.UPLOAD, file.name))

          // 1. Immediate upload request (returns HTTP 202 Accepted in ~100-300ms)
          const res = await uploadDocument(file, cid, {
            signal,
            onSent: () => {
              steps((s) => completeStep(s, STEP.UPLOAD))
            },
          })

          const docId = res.document_id || res.doc_id
          applyDoc(docId, file.name)
          attachDocumentToChat(cid, docId).catch(() => {})
          setSessions(
            patchSession(cid, { docId, docName: file.name, updatedAt: Date.now() }),
          )
          steps((s) => completeStep(s, STEP.UPLOAD))

          if (res.status === 'ready') {
            // Deduplication instant cache hit!
            steps((s) => completeStep(s, STEP.INDEX))
            patchUser((m) => ({ ...m, file: { ...m.file, status: 'ready' } }))
            patchAssistant((m) => ({
              ...m,
              details: { filename: file.name, sections: res.page_count || undefined },
            }))
          } else {
            // Asynchronous background indexing: poll status every 1-2s
            setAgentStatus('indexing')
            steps((s) => activateStep(s, STEP.INDEX, 'Processing PDF'))
            patchUser((m) => ({ ...m, file: { ...m.file, status: 'indexing' } }))

            const statusData = await pollDocumentUntilReady(docId, {
              signal,
              onProgress: (statusInfo) => {
                const stageMsg = statusInfo.current_stage || 'Processing PDF'
                steps((s) => updateStep(s, STEP.INDEX, stageMsg))
              },
            })

            steps((s) => completeStep(s, STEP.INDEX))
            patchUser((m) => ({ ...m, file: { ...m.file, status: 'ready' } }))
            patchAssistant((m) => ({
              ...m,
              details: {
                filename: file.name,
                sections: statusData.section_count || statusData.page_count || undefined,
              },
            }))
          }

          setAgentStatus('ready')
          entry.file = null // uploaded: a retry must not upload again
          phase = 'ask'
        }

        // ---- B. Ask (PageIndex search happens server-side before the first token) ----
        const activeDocId = docRef.current.id
        if (activeDocId) {
          try {
            const st = await fetchDocumentStatus(activeDocId, { signal })
            if (st.status === 'indexing') {
              setAgentStatus('indexing')
              steps((s) => activateStep(s, STEP.INDEX, st.current_stage || 'Processing PDF'))
              const statusData = await pollDocumentUntilReady(activeDocId, {
                signal,
                onProgress: (info) => {
                  steps((s) => updateStep(s, STEP.INDEX, info.current_stage || 'Processing PDF'))
                },
              })
              steps((s) => completeStep(s, STEP.INDEX))
            } else if (st.status === 'failed') {
              setAgentStatus('indexing')
              steps((s) => activateStep(s, STEP.INDEX, 'Processing PDF'))
              await retryDocumentIndexing(activeDocId, { signal })
              const statusData = await pollDocumentUntilReady(activeDocId, {
                signal,
                onProgress: (info) => {
                  steps((s) => updateStep(s, STEP.INDEX, info.current_stage || 'Processing PDF'))
                },
              })
              steps((s) => completeStep(s, STEP.INDEX))
            }
          } catch (err) {
            if (isAbort(err)) throw err
            console.warn('Status pre-check warning:', err)
          }
        }

        setAgentStatus('retrieving')
        steps((s) => activateStep(s, STEP.RETRIEVE, 'Searching document'))
        patchAssistant((m) => ({ ...m, status: 'pending' }))

        let retrievalFinished = false

        await streamAsk({
          doc_id: activeDocId || undefined,
          doc_name: docRef.current.name || undefined,
          chat_id: cid,
          query: entry.query,
          deep_analysis: Boolean(entry.deepAnalysis),
          signal,
          onStage: (stageInfo) => {
            if (stageInfo?.stage === 'retrieved' && !retrievalFinished) {
              retrievalFinished = true
              setAgentStatus('generating')
              const durationMs =
                stageInfo.duration != null ? Math.round(stageInfo.duration * 1000) : undefined
              patchAssistant((m) => {
                const s1 = completeStep(m.steps ?? [], STEP.RETRIEVE, durationMs)
                const s2 = activateStep(s1, STEP.GENERATE, 'Synthesizing grounded answer')
                return { ...m, steps: s2 }
              })
            }
          },
          onDelta: (chunk) => {
            if (!gotFirst) {
              gotFirst = true
              phase = 'stream'
              setAgentStatus('streaming')
              patchAssistant((m) => ({
                ...m,
                status: 'streaming',
                steps: activateStep(completeStep(m.steps ?? [], STEP.RETRIEVE), STEP.GENERATE),
              }))
            }
            const buf = bufferRef.current
            buf.text += chunk
            if (!buf.raf) buf.raf = requestAnimationFrame(flushNow)
          },
        })

        flushNow()
        if (!gotFirst) throw new Error('The server returned an empty response.')
        patchAssistant((m) => ({
          ...m,
          status: 'completed',
          completedAt: Date.now(),
          steps: completeStep(completeStep(m.steps ?? [], STEP.RETRIEVE), STEP.GENERATE),
        }))
        setAgentStatus('completed')
      } catch (e) {
        flushNow()
        if (isAbort(e)) {
          patchAssistant((m) => ({
            ...m,
            status: 'stopped',
            completedAt: Date.now(),
            steps: failActive(m.steps ?? [], undefined, 'stopped'),
          }))
          if (phase === 'upload') {
            patchUser((m) => ({ ...m, file: { ...m.file, status: 'error' } }))
          }
          setAgentStatus(docRef.current.id ? 'ready' : 'idle')
        } else {
          console.error(e)
          const text = errorMessage(e)
          patchAssistant((m) => ({
            ...m,
            status: 'error',
            error: text,
            completedAt: Date.now(),
            steps: failActive(m.steps ?? [], undefined),
          }))
          if (phase === 'upload') {
            patchUser((m) => ({ ...m, file: { ...m.file, status: 'error' } }))
          }
          setAgentStatus('error')
        }
      } finally {
        if (streamAbortRef.current === controller) streamAbortRef.current = null
      }
    },
    [applyDoc, flushNow],
  )

  // Send message + attached file together
  const handleSend = useCallback(async (opts = {}) => {
    const query = input.trim()
    const fileToUpload = attachedFile
    const deepAnalysis = Boolean(opts?.deepAnalysis)

    if ((!query && !fileToUpload) || busy) return

    setInput('')
    setAttachedFile(null)

    // Ensure we have an active chat session
    let activeChatId = chatId
    if (!activeChatId) {
      try {
        const { chat_id } = await createChat()
        activeChatId = chat_id
        setChatId(chat_id)
        setSessions(
          upsertSession({
            chatId: chat_id,
            docId: docRef.current.id || null,
            title: query
              ? query.slice(0, 50)
              : fileToUpload
                ? `PDF: ${fileToUpload.name}`
                : 'New chat',
            updatedAt: Date.now(),
          }),
        )
      } catch (err) {
        console.error(err)
        toast.error('Failed to create chat.')
        // Give the user their input back instead of losing it.
        setInput(query)
        setAttachedFile(fileToUpload)
        return
      }
    }

    // Resolve a document persisted for this session if state was lost (e.g. reload).
    if (!docRef.current.id) {
      const sess = loadSessions().find((s) => s.chatId === activeChatId)
      if (sess?.docId) applyDoc(sess.docId, sess.docName ?? null)
    }

    const userText =
      query || (fileToUpload ? 'Please analyze and summarize the main sections of this document.' : '')
    const userId = crypto.randomUUID()
    const assistantId = crypto.randomUUID()

    const userMessage = {
      id: userId,
      role: 'user',
      content: userText,
      file: fileToUpload
        ? { name: fileToUpload.name, size: fileToUpload.size, status: 'uploading' }
        : undefined,
    }
    const assistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      status: 'pending',
      startedAt: Date.now(),
      steps: createSteps({ hasFile: Boolean(fileToUpload), hasDoc: Boolean(docRef.current.id) }),
      details: docRef.current.name ? { filename: docRef.current.name } : undefined,
    }
    setMessages((prev) => [...prev, userMessage, assistantMessage])

    // Update session title in sidebar
    const current = loadSessions().find((s) => s.chatId === activeChatId)
    if (current && (current.title === 'New chat' || current.title === 'محادثة جديدة')) {
      setSessions(
        patchSession(activeChatId, { title: userText.slice(0, 60), updatedAt: Date.now() }),
      )
    } else {
      setSessions(patchSession(activeChatId, { updatedAt: Date.now() }))
    }

    const entry = { query: userText, file: fileToUpload, deepAnalysis }
    turnsRef.current.set(assistantId, { ...entry, userId, chatId: activeChatId })
    await processTurn({
      assistantId,
      userId,
      entry: turnsRef.current.get(assistantId),
      chatId: activeChatId,
    })
  }, [input, attachedFile, busy, chatId, applyDoc, processTurn])

  // Retry a failed/stopped turn or regenerate the last answer.
  const handleRetry = useCallback(
    async (assistantId) => {
      if (busy) return
      const idx = messages.findIndex((m) => m.id === assistantId)
      if (idx === -1) return

      let entry = turnsRef.current.get(assistantId)
      if (!entry) {
        // Message restored from server history: rebuild from the preceding user turn.
        const prevUser = messages[idx - 1]
        if (!prevUser || prevUser.role !== 'user') {
          toast.error('Nothing to retry for this message.')
          return
        }
        entry = { query: prevUser.content, file: null, userId: prevUser.id, chatId }
        turnsRef.current.set(assistantId, entry)
      }

      const cid = entry.chatId || chatId
      if (!cid) return

      setMessages((prev) =>
        patchById(prev, assistantId, (m) => ({
          ...m,
          content: '',
          status: 'pending',
          error: undefined,
          startedAt: Date.now(),
          completedAt: undefined,
          steps: createSteps({ hasFile: Boolean(entry.file), hasDoc: Boolean(docRef.current.id) }),
        })),
      )
      if (entry.file && entry.userId) {
        setMessages((prev) =>
          patchById(prev, entry.userId, (m) => ({ ...m, file: { ...m.file, status: 'uploading' } })),
        )
      }
      await processTurn({ assistantId, userId: entry.userId, entry, chatId: cid })
    },
    [busy, messages, chatId, processTurn],
  )

  const handleDetachDocument = useCallback(async () => {
    if (!chatId) return
    try {
      await detachDocumentFromChat(chatId)
      applyDoc(null, null)
      setAgentStatus('idle')
      setSessions(
        patchSession(chatId, {
          docId: null,
          docName: null,
          updatedAt: Date.now(),
        }),
      )
      toast.info('Document detached. Switched back to conversational mode.')
    } catch (e) {
      console.error(e)
      toast.error('Failed to detach document.')
    }
  }, [chatId, applyDoc])

  const handleDeleteSession = useCallback(
    async (sessionId) => {
      const remaining = deleteSession(sessionId)
      setSessions(remaining)
      if (chatId === sessionId) {
        handleNewChat()
      }
      try {
        await deleteChat(sessionId)
      } catch (e) {
        console.warn('Backend delete failed:', e)
      }
      toast.success('Chat deleted.')
    },
    [chatId, handleNewChat],
  )

  const handleRenameSession = useCallback(async (sessionId, newTitle) => {
    const trimmed = (newTitle || '').trim()
    if (!trimmed) return
    const updated = patchSession(sessionId, {
      title: trimmed,
      updatedAt: Date.now(),
    })
    setSessions(updated)
    try {
      await renameChat(sessionId, trimmed)
    } catch (e) {
      console.warn('Backend rename failed:', e)
    }
    toast.success('Chat renamed.')
  }, [])

  const sidebar = (
    <Sidebar
      sessions={sessions}
      activeChatId={chatId}
      isStreaming={busy}
      onNewChat={handleNewChat}
      onSelectSession={handleSelectSession}
      onDeleteSession={handleDeleteSession}
      onRenameSession={handleRenameSession}
      onCloseSidebar={() => setMobileSidebarOpen(false)}
    />
  )

  const fileStatus =
    agentStatus === 'uploading' ? 'uploading' : agentStatus === 'indexing' ? 'indexing' : 'staged'
  const isUploading = agentStatus === 'uploading' || agentStatus === 'indexing'

  const composerProps = {
    value: input,
    onChange: setInput,
    onSend: handleSend,
    onStop: handleStop,
    attachedFile,
    onSelectFile: handleSelectFile,
    onRemoveFile: handleRemoveFile,
    isUploading,
    fileStatus,
    hasDoc: Boolean(docId),
    disabled: false,
    isStreaming: busy,
  }

  return (
    <ChatLayout
      sidebar={sidebar}
      mobileSidebarOpen={mobileSidebarOpen}
      onMobileSidebarOpenChange={setMobileSidebarOpen}
      onNewChat={handleNewChat}
    >
      {/* Announces stage changes (not individual tokens) to assistive tech. */}
      <div className="sr-only" role="status" aria-live="polite">
        {AGENT_STATUS_TEXT[agentStatus]}
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-[#212121]">
        {/* Active Document Indicator Banner (When a doc is active in this session) */}
        {docId ? (
          <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-[#171717]/80 px-4 py-2 text-xs text-zinc-300 md:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-red-400" aria-hidden />
              <span className="hidden shrink-0 font-medium text-zinc-200 sm:inline">Active Document:</span>
              <span className="max-w-[200px] truncate rounded bg-white/10 px-2 py-0.5 text-zinc-300 md:max-w-md">
                {docName || 'PDF Document'}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden font-mono text-[11px] text-zinc-500 md:inline">
                Vectorless RAG Tree Active
              </span>
              <button
                type="button"
                onClick={handleDetachDocument}
                disabled={busy}
                title="Detach document from this chat"
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-zinc-400 transition hover:bg-white/10 hover:text-red-400 disabled:opacity-40"
              >
                <X className="h-3 w-3" aria-hidden />
                <span className="hidden md:inline">Detach</span>
              </button>
            </div>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto p-4">
            <EmptyState onPick={setInput} docName={docName} />
            <ChatInput {...composerProps} isCentered={true} />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <MessageList messages={messages} busy={busy} onRetry={handleRetry} />

            <div className="bg-gradient-to-t from-[#212121] via-[#212121]/95 to-transparent pt-2">
              <ChatInput {...composerProps} isCentered={false} />
            </div>
          </div>
        )}
      </div>
    </ChatLayout>
  )
}
