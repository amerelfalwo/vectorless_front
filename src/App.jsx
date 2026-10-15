import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
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
  fetchDocumentTree,
  listDocuments,
  fetchChatDocs,
  detachSpecificDocument,
} from './api/client.js'
import { ChatLayout } from './components/ChatLayout.jsx'
import { ChatInput } from './components/ChatInput.jsx'
import { EmptyState } from './components/EmptyState.jsx'
import { MessageList } from './components/MessageList.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import { DocumentLibrary } from './components/DocumentLibrary.jsx'
import { DocumentStructureExplorer } from './components/DocumentStructureExplorer.jsx'
import { KnowledgeMemoryView } from './components/KnowledgeMemoryView.jsx'
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
 * Busy agent statuses
 */
const BUSY_STATUSES = new Set(['uploading', 'indexing', 'retrieving', 'generating', 'streaming'])

function mapHistoryToMessages(history) {
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
  // Navigation / Routing State: synchronized with browser URL
  const [currentView, setCurrentView] = useState(() => {
    const p = window.location.pathname
    if (p.startsWith('/documents')) return 'documents'
    if (p.startsWith('/knowledge')) return 'knowledge'
    return 'chat'
  })

  const [docId, setDocId] = useState(null)
  const [docName, setDocName] = useState(null)
  const [attachedDocs, setAttachedDocs] = useState([])
  const [availableDocs, setAvailableDocs] = useState([])

  const [chatId, setChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [sessions, setSessions] = useState(() => loadSessions())
  const [input, setInput] = useState('')

  const [attachedFile, setAttachedFile] = useState(null)
  const [agentStatus, setAgentStatus] = useState('idle')

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [structureExplorerOpen, setStructureExplorerOpen] = useState(false)
  const [documentTree, setDocumentTree] = useState(null)
  const [activeTreeNodeId, setActiveTreeNodeId] = useState(null)

  const busy = BUSY_STATUSES.has(agentStatus)

  const streamAbortRef = useRef(null)
  const docRef = useRef({ id: null, name: null })
  const turnsRef = useRef(new Map())
  const bufferRef = useRef({ id: null, text: '', raf: 0 })

  // Synchronize browser history and route navigation
  const handleNavigate = useCallback((view) => {
    setCurrentView(view)
    const targetPath =
      view === 'documents' ? '/documents' : view === 'knowledge' ? '/knowledge' : '/'
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath)
    }
    setMobileSidebarOpen(false)
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname
      const view = p.startsWith('/documents')
        ? 'documents'
        : p.startsWith('/knowledge')
        ? 'knowledge'
        : 'chat'
      setCurrentView(view)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const applyDoc = useCallback((id, name) => {
    docRef.current = { id, name }
    setDocId(id)
    setDocName(name)
    setDocumentTree(null)
  }, [])

  // Refresh list of available documents from backend
  const refreshAvailableDocs = useCallback(() => {
    listDocuments()
      .then((data) => {
        setAvailableDocs((data.documents || []).filter((d) => d.status === 'ready'))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshAvailableDocs()
  }, [refreshAvailableDocs])

  // Load tree whenever docId changes and explorer is opened
  const loadDocTree = useCallback(async (id) => {
    if (!id) return
    try {
      const data = await fetchDocumentTree(id)
      setDocumentTree(data.tree || [])
    } catch (err) {
      console.warn('Could not load tree:', err)
    }
  }, [])

  const toggleStructureExplorer = useCallback(() => {
    setStructureExplorerOpen((prev) => {
      const next = !prev
      const targetId = docRef.current.id || attachedDocs[0]?.doc_id
      if (next && targetId && !documentTree) {
        loadDocTree(targetId)
      }
      return next
    })
  }, [documentTree, loadDocTree, attachedDocs])

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
          title: c.title || 'New research',
          updatedAt: Math.round((c.updated_at || Date.now() / 1000) * 1000),
        }))
        setSessions(mapped)
        mapped.forEach((s) => upsertSession(s))
      })
      .catch((e) => console.warn('Could not load sessions from backend:', e))
  }, [])

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
    setAttachedDocs([])
    setMessages([])
    setAgentStatus('idle')
    setStructureExplorerOpen(false)

    try {
      const { chat_id } = await createChat()
      setChatId(chat_id)
      setSessions(
        upsertSession({
          chatId: chat_id,
          docId: null,
          title: 'New research',
          updatedAt: Date.now(),
        }),
      )
      setMobileSidebarOpen(false)
      handleNavigate('chat')
    } catch (e) {
      console.error(e)
      toast.error('Failed to initialize research session.')
    }
  }, [agentStatus, applyDoc, handleNavigate])

  const handleStop = useCallback(() => {
    streamAbortRef.current?.abort()
  }, [])

  /**
   * Polls GET /documents/{docId}/status until status is 'ready' or 'failed'.
   */
  const pollDocumentUntilReady = useCallback(
    async (documentId, { signal, onProgress, intervalMs = 1500 } = {}) => {
      while (!signal?.aborted) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs))
        if (signal?.aborted) break

        try {
          const data = await fetchDocumentStatus(documentId, { signal })
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
   * Select a session with STRICT session isolation:
   * loads only that session's messages and attached documents.
   */
  const handleSelectSession = useCallback(
    async (session) => {
      streamAbortRef.current?.abort()
      streamAbortRef.current = null
      setInput('')
      setAttachedFile(null)
      setMobileSidebarOpen(false)
      handleNavigate('chat')
      setChatId(session.chatId)

      try {
        // 1. Fetch isolated chat history
        const data = await fetchChatHistory(session.chatId)
        setMessages(mapHistoryToMessages(data.history))

        // 2. Fetch isolated attached documents for this specific session
        const docsData = await fetchChatDocs(session.chatId)
        const currentDocs = docsData.documents || []
        setAttachedDocs(currentDocs)

        if (currentDocs.length > 0) {
          applyDoc(currentDocs[0].doc_id, currentDocs[0].filename)
          setAgentStatus('ready')
        } else {
          applyDoc(null, null)
          setAgentStatus('idle')
        }
      } catch (e) {
        console.error(e)
        setMessages([])
        setAttachedDocs([])
        applyDoc(null, null)
        toast.error('Failed to load conversation history.')
      }
    },
    [applyDoc, handleNavigate],
  )

  /**
   * Attach an additional document from the library to current active chat session.
   */
  const handleAttachDoc = useCallback(
    async (doc) => {
      if (!chatId) return
      try {
        await attachDocumentToChat(chatId, doc.doc_id)
        setAttachedDocs((prev) => {
          if (prev.some((d) => d.doc_id === doc.doc_id)) return prev
          return [...prev, doc]
        })
        if (!docRef.current.id) {
          applyDoc(doc.doc_id, doc.filename)
        }
        setAgentStatus('ready')
        toast.success(`Attached "${doc.filename}" to session`)
      } catch (err) {
        toast.error('Failed to attach document')
      }
    },
    [chatId, applyDoc],
  )

  /**
   * Detach a specific document from the current chat session.
   */
  const handleDetachSpecificDoc = useCallback(
    async (targetDocId) => {
      if (!chatId) return
      try {
        await detachSpecificDocument(chatId, targetDocId)
        setAttachedDocs((prev) => {
          const next = prev.filter((d) => d.doc_id !== targetDocId)
          if (next.length > 0) {
            applyDoc(next[0].doc_id, next[0].filename)
          } else {
            applyDoc(null, null)
            setAgentStatus('idle')
          }
          return next
        })
        toast.info('Document detached from session')
      } catch (err) {
        toast.error('Failed to detach document')
      }
    },
    [chatId, applyDoc],
  )

  /**
   * One assistant turn: upload/index if needed, then streamed /ask with multi-doc telemetry.
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
        // ---- A. Upload + index ----
        if (entry.file) {
          const file = entry.file
          setAgentStatus('uploading')
          steps((s) => activateStep(s, STEP.UPLOAD, `Uploading ${file.name}`))

          const res = await uploadDocument(file, cid, {
            signal,
            onSent: () => {
              steps((s) => completeStep(s, STEP.UPLOAD, undefined, 'Document uploaded'))
            },
          })

          const targetDocId = res.document_id || res.doc_id
          applyDoc(targetDocId, file.name)
          attachDocumentToChat(cid, targetDocId).catch(() => {})

          const newDocObj = {
            doc_id: targetDocId,
            filename: file.name,
            page_count: res.page_count || 1,
            status: res.status || 'ready',
          }
          setAttachedDocs((prev) => {
            if (prev.some((d) => d.doc_id === targetDocId)) return prev
            return [...prev, newDocObj]
          })
          refreshAvailableDocs()

          setSessions(
            patchSession(cid, { docId: targetDocId, docName: file.name, updatedAt: Date.now() }),
          )
          steps((s) => completeStep(s, STEP.UPLOAD, undefined, 'Document uploaded'))

          if (res.status === 'ready') {
            steps((s) => completeStep(s, STEP.INDEX, undefined, 'Reused cached tree index'))
            patchUser((m) => ({ ...m, file: { ...m.file, status: 'ready' } }))
            patchAssistant((m) => ({
              ...m,
              details: { filename: file.name, sections: res.page_count || undefined },
            }))
          } else {
            setAgentStatus('indexing')
            steps((s) => activateStep(s, STEP.INDEX, 'Constructing section tree index'))
            patchUser((m) => ({ ...m, file: { ...m.file, status: 'indexing' } }))

            const statusData = await pollDocumentUntilReady(targetDocId, {
              signal,
              onProgress: (statusInfo) => {
                const stageMsg = statusInfo.current_stage || 'Processing document'
                steps((s) => updateStep(s, STEP.INDEX, stageMsg))
              },
            })

            steps((s) => completeStep(s, STEP.INDEX, undefined, 'Tree index verified'))
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
          entry.file = null
          phase = 'ask'
        }

        // ---- B. Ask with real retrieval telemetry stages ----
        const currentDocIds = attachedDocs.map((d) => d.doc_id)
        if (docRef.current.id && !currentDocIds.includes(docRef.current.id)) {
          currentDocIds.push(docRef.current.id)
        }

        setAgentStatus('retrieving')
        // Progress through real retrieval stages
        steps((s) =>
          activateStep(
            s,
            STEP.UNDERSTAND,
            currentDocIds.length > 1
              ? `Analyzing question across ${currentDocIds.length} attached documents`
              : 'Analyzing question requirements',
          ),
        )
        patchAssistant((m) => ({ ...m, status: 'pending' }))

        // Transition to document tree exploration
        setTimeout(() => {
          steps((s) => {
            const s1 = completeStep(s, STEP.UNDERSTAND, undefined, 'Question analyzed')
            return activateStep(
              s1,
              STEP.EXPLORE,
              currentDocIds.length > 1
                ? `Searching hierarchies across ${currentDocIds.length} documents`
                : 'Traversing document section hierarchy',
            )
          })
        }, 150)

        let retrievalFinished = false

        await streamAsk({
          doc_id: currentDocIds[0] || undefined,
          doc_ids: currentDocIds.length > 0 ? currentDocIds : undefined,
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
              const nodesMatched = stageInfo.nodes != null ? stageInfo.nodes : undefined

              patchAssistant((m) => {
                let currentSteps = m.steps ?? []
                currentSteps = completeStep(
                  currentSteps,
                  STEP.EXPLORE,
                  undefined,
                  'Document structure traversed',
                )
                currentSteps = completeStep(
                  currentSteps,
                  STEP.SELECT,
                  undefined,
                  nodesMatched
                    ? `${nodesMatched} relevant sections selected`
                    : 'Sections selected',
                )
                currentSteps = completeStep(
                  currentSteps,
                  STEP.RETRIEVE,
                  durationMs,
                  'Supporting evidence retrieved',
                )
                currentSteps = activateStep(
                  currentSteps,
                  STEP.GENERATE,
                  'Synthesizing grounded answer',
                )
                return {
                  ...m,
                  steps: currentSteps,
                  details: {
                    ...(m.details || {}),
                    nodes: nodesMatched,
                    duration: durationMs,
                  },
                }
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
                steps: activateStep(
                  completeStep(
                    completeStep(m.steps ?? [], STEP.EXPLORE),
                    STEP.RETRIEVE,
                  ),
                  STEP.GENERATE,
                ),
              }))
            }
            const buf = bufferRef.current
            buf.text += chunk
            if (!buf.raf) buf.raf = requestAnimationFrame(flushNow)
          },
        })

        flushNow()

        patchAssistant((m) => {
          const finalDuration =
            m.details?.duration != null
              ? m.details.duration
              : Math.round((Date.now() - (m.createdAt || Date.now())) / 10) / 100
          return {
            ...m,
            status: 'completed',
            steps: completeStep(m.steps ?? [], STEP.GENERATE),
            details: {
              ...(m.details || {}),
              duration: finalDuration,
            },
          }
        })

        setSessions((prev) =>
          patchSession(cid, {
            updatedAt: Date.now(),
          }),
        )

        setAgentStatus(currentDocIds.length > 0 ? 'ready' : 'idle')
      } catch (err) {
        flushNow()
        if (isAbort(err)) {
          patchAssistant((m) => ({
            ...m,
            status: 'aborted',
            steps: (m.steps ?? []).map((st) =>
              st.status === 'in_progress' ? { ...st, status: 'completed' } : st,
            ),
          }))
          setAgentStatus(attachedDocs.length > 0 ? 'ready' : 'idle')
          return
        }

        console.error(err)
        const msg = errorMessage(err)
        patchAssistant((m) => ({
          ...m,
          status: 'error',
          error: msg,
          steps: failActive(m.steps ?? [], msg),
        }))
        setAgentStatus('error')
        toast.error(msg)
      } finally {
        streamAbortRef.current = null
      }
    },
    [
      applyDoc,
      attachedDocs,
      flushNow,
      pollDocumentUntilReady,
      refreshAvailableDocs,
    ],
  )

  const handleSend = useCallback(
    async (text, fileOverride = null) => {
      const q = text.trim()
      const fileToSend = fileOverride || attachedFile
      if (!q && !fileToSend) return
      if (BUSY_STATUSES.has(agentStatus)) return

      let cid = chatId
      if (!cid) {
        try {
          const { chat_id } = await createChat()
          cid = chat_id
          setChatId(chat_id)
        } catch (e) {
          console.error(e)
          toast.error('Could not start research conversation.')
          return
        }
      }

      const turnKey = crypto.randomUUID()
      const userMsgId = crypto.randomUUID()
      const assistantMsgId = crypto.randomUUID()

      const entry = {
        query: q,
        file: fileToSend,
        deepAnalysis: false,
      }
      turnsRef.current.set(turnKey, { entry, chatId: cid })

      // Auto-title conversation on first message
      const titleCandidate = q.slice(0, 40) || fileToSend?.name || 'New research'
      const updatedSessions = upsertSession({
        chatId: cid,
        docId: docRef.current.id,
        docName: docRef.current.name,
        title: titleCandidate,
        updatedAt: Date.now(),
      })
      setSessions(updatedSessions)
      if (messages.length === 0) {
        renameChat(cid, titleCandidate).catch(() => {})
      }

      // Optimistic user bubble
      const userBubble = {
        id: userMsgId,
        role: 'user',
        content: q,
        status: 'completed',
        createdAt: Date.now(),
        file: fileToSend
          ? {
              name: fileToSend.name,
              size: fileToSend.size,
              status: 'uploading',
            }
          : undefined,
      }

      // Placeholder assistant bubble
      const assistantBubble = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        status: 'pending',
        createdAt: Date.now(),
        steps: createSteps(Boolean(fileToSend)),
      }

      setMessages((prev) => [...prev, userBubble, assistantBubble])
      setInput('')
      setAttachedFile(null)

      processTurn({
        assistantId: assistantMsgId,
        userId: userMsgId,
        entry,
        chatId: cid,
      })
    },
    [agentStatus, attachedFile, chatId, messages.length, processTurn],
  )

  const handleRetry = useCallback(
    (msgId) => {
      const idx = messages.findIndex((m) => m.id === msgId)
      if (idx === -1) return
      const prevUser = messages
        .slice(0, idx)
        .reverse()
        .find((m) => m.role === 'user')
      if (!prevUser) return
      handleSend(prevUser.content)
    },
    [handleSend, messages],
  )

  // Detach all documents
  const handleDetachDocument = useCallback(async () => {
    if (!chatId) return
    try {
      await detachDocumentFromChat(chatId)
      applyDoc(null, null)
      setAttachedDocs([])
      setAgentStatus('idle')
      setStructureExplorerOpen(false)
      setSessions(
        patchSession(chatId, {
          docId: null,
          docName: null,
          updatedAt: Date.now(),
        }),
      )
      toast.info('All documents detached. Switched to general conversation.')
    } catch (e) {
      console.error(e)
      toast.error('Failed to detach documents.')
    }
  }, [chatId, applyDoc])

  // Delete chat
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
      toast.success('Conversation deleted.')
    },
    [chatId, handleNewChat],
  )

  // Rename chat
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
    toast.success('Conversation renamed.')
  }, [])

  // Start research from Document Library
  const handleSelectDocumentForChat = useCallback(
    async (targetDocId, targetDocName, initialPrompt) => {
      applyDoc(targetDocId, targetDocName)
      setAgentStatus('ready')
      handleNavigate('chat')

      let cid = chatId
      if (!cid) {
        try {
          const { chat_id } = await createChat()
          cid = chat_id
          setChatId(chat_id)
        } catch {
          // fallback
        }
      }

      if (cid) {
        attachDocumentToChat(cid, targetDocId).catch(() => {})
        setAttachedDocs((prev) => {
          if (prev.some((d) => d.doc_id === targetDocId)) return prev
          return [...prev, { doc_id: targetDocId, filename: targetDocName, status: 'ready' }]
        })
        setSessions(
          upsertSession({
            chatId: cid,
            docId: targetDocId,
            docName: targetDocName,
            title: `Research: ${targetDocName}`,
            updatedAt: Date.now(),
          }),
        )
      }

      if (initialPrompt) {
        setInput(initialPrompt)
      }
      toast.success(`Attached "${targetDocName}" to research workspace.`)
    },
    [applyDoc, chatId, handleNavigate],
  )

  // Handle citation click: open structure explorer and focus section
  const handleSelectCitation = useCallback(
    async (source) => {
      const targetId = docRef.current.id || attachedDocs[0]?.doc_id
      if (!targetId) return
      setStructureExplorerOpen(true)
      if (!documentTree) {
        await loadDocTree(targetId)
      }
      if (source?.title) {
        setActiveTreeNodeId(source.title)
      }
    },
    [documentTree, loadDocTree, attachedDocs],
  )

  const sidebar = (
    <Sidebar
      sessions={sessions}
      activeChatId={chatId}
      isStreaming={busy}
      onNewChat={handleNewChat}
      onSelectSession={handleSelectSession}
      onDeleteSession={handleDeleteSession}
      onRenameSession={handleRenameSession}
      onCloseSidebar={() => {
        setSidebarCollapsed(true)
        setMobileSidebarOpen(false)
      }}
      currentView={currentView}
      onNavigate={handleNavigate}
      attachedDocs={attachedDocs}
      availableDocs={availableDocs}
      onAttachDoc={handleAttachDoc}
      onDetachDoc={handleDetachSpecificDoc}
      onToggleStructureExplorer={attachedDocs.length > 0 ? toggleStructureExplorer : undefined}
      structureExplorerOpen={structureExplorerOpen}
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
    hasDoc: attachedDocs.length > 0,
    disabled: false,
    isStreaming: busy,
  }

  const activeExplorerDocId = docRef.current.id || attachedDocs[0]?.doc_id
  const activeExplorerDocName = docRef.current.name || attachedDocs[0]?.filename || 'Document'

  const structureExplorerNode =
    structureExplorerOpen && activeExplorerDocId ? (
      <DocumentStructureExplorer
        tree={documentTree || []}
        docName={activeExplorerDocName}
        docId={activeExplorerDocId}
        activeNodeId={activeTreeNodeId}
        onClose={() => setStructureExplorerOpen(false)}
        onSelectNode={(node) => setActiveTreeNodeId(node.node_id || node.id)}
        onAskSection={(node) => {
          setInput(`Explain the section "${node.title || node.name}" and cite key findings.`)
        }}
      />
    ) : null

  return (
    <ChatLayout
      sidebar={sidebar}
      structureExplorer={structureExplorerNode}
      mobileSidebarOpen={mobileSidebarOpen}
      onMobileSidebarOpenChange={setMobileSidebarOpen}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarCollapsedChange={setSidebarCollapsed}
    >
      <div className="sr-only" role="status" aria-live="polite">
        {AGENT_STATUS_TEXT[agentStatus]}
      </div>

      {currentView === 'documents' ? (
        <DocumentLibrary
          onSelectDocumentForChat={handleSelectDocumentForChat}
          onOpenStructureExplorer={(doc) => {
            applyDoc(doc.doc_id, doc.filename)
            loadDocTree(doc.doc_id)
            setStructureExplorerOpen(true)
          }}
        />
      ) : currentView === 'knowledge' ? (
        <KnowledgeMemoryView
          onStartChatWithDoc={async (docId, filename) => {
            await handleNewChat()
            handleAttachDoc({ doc_id: docId, filename })
            handleNavigate('chat')
          }}
          onAskAboutKnowledge={(seedText) => {
            handleNavigate('chat')
            setInput(
              seedText
                ? `Based on our collective knowledge: ${seedText}`
                : 'Summarize the overarching insights in our knowledge base.',
            )
          }}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F7F6F1]">
          {messages.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto p-4">
              <EmptyState onPick={setInput} docName={docName || (attachedDocs[0]?.filename)} />
              <ChatInput {...composerProps} isCentered={true} />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <MessageList
                messages={messages}
                busy={busy}
                onRetry={handleRetry}
                onSelectCitation={handleSelectCitation}
              />

              <div className="bg-gradient-to-t from-[#F7F6F1] via-[#F7F6F1]/95 to-transparent pt-2">
                <ChatInput {...composerProps} isCentered={false} />
              </div>
            </div>
          )}
        </div>
      )}
    </ChatLayout>
  )
}
