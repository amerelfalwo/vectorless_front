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
import { StudyStudioView } from './components/StudyStudioView.jsx'
import { CenterNotification } from './components/CenterNotification.jsx'
import {
  loadSessions,
  patchSession,
  upsertSession,
  deleteSession,
  loadActiveChatId,
  saveActiveChatId,
  loadChatMessages,
  saveChatMessages,
  deleteChatMessages,
  mergeSessions,
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
    if (p.startsWith('/studio')) return 'studio'
    return 'chat'
  })

  const [docId, setDocId] = useState(null)
  const [docName, setDocName] = useState(null)
  const [attachedDocs, setAttachedDocs] = useState([])
  const [availableDocs, setAvailableDocs] = useState([])

  const [sessions, setSessions] = useState(() => loadSessions())
  const [chatId, setChatId] = useState(() => {
    const active = loadActiveChatId()
    const all = loadSessions()
    if (active && all.some((s) => s.chatId === active)) {
      return active
    }
    return all.length > 0 ? all[0].chatId : null
  })
  const [messages, setMessages] = useState(() => {
    const active = loadActiveChatId()
    const all = loadSessions()
    const targetId = active && all.some((s) => s.chatId === active) ? active : all[0]?.chatId
    if (targetId) {
      return loadChatMessages(targetId)
    }
    return []
  })
  const [input, setInput] = useState('')

  const [attachedFile, setAttachedFile] = useState(null)
  
  // Asynchronous multi-session concurrency state
  const [sessionStatuses, setSessionStatuses] = useState({})
  const [unreadSessionIds, setUnreadSessionIds] = useState(() => new Set())
  const [centerNotice, setCenterNotice] = useState(null)

  // Status of the currently active session
  const agentStatus = (chatId && sessionStatuses[chatId]) ? sessionStatuses[chatId] : 'idle'
  const busy = BUSY_STATUSES.has(agentStatus)

  // UI state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [structureExplorerOpen, setStructureExplorerOpen] = useState(false)
  const [documentTree, setDocumentTree] = useState(null)
  const [activeTreeNodeId, setActiveTreeNodeId] = useState(null)

  const docRef = useRef({ id: null, name: null })
  const turnsRef = useRef(new Map())
  const sessionStreamsRef = useRef(new Map())
  const sessionBuffersRef = useRef(new Map())
  const currentChatIdRef = useRef(chatId)
  currentChatIdRef.current = chatId
  const messagesRef = useRef(messages)
  messagesRef.current = messages
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions
  const attachedDocsByChatRef = useRef(new Map())

  const setSessionStatus = useCallback((targetChatId, status) => {
    setSessionStatuses((prev) => {
      if (prev[targetChatId] === status) return prev
      return { ...prev, [targetChatId]: status }
    })
  }, [])

  const patchSessionMessages = useCallback((targetChatId, updater) => {
    if (currentChatIdRef.current === targetChatId) {
      setMessages((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        saveChatMessages(targetChatId, next)
        return next
      })
    } else {
      const current = loadChatMessages(targetChatId) || []
      const next = typeof updater === 'function' ? updater(current) : updater
      saveChatMessages(targetChatId, next)
    }
  }, [])

  // Keep active chat ID persisted
  useEffect(() => {
    if (chatId) {
      saveActiveChatId(chatId)
    }
  }, [chatId])

  // Keep messages persisted locally per chat
  useEffect(() => {
    if (chatId && messages.length > 0) {
      saveChatMessages(chatId, messages)
    }
  }, [chatId, messages])

  // Synchronize browser history and route navigation
  const handleNavigate = useCallback((view) => {
    setCurrentView(view)
    const targetPath =
      view === 'documents'
        ? '/documents'
        : view === 'knowledge'
        ? '/knowledge'
        : view === 'studio'
        ? '/studio'
        : '/'
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
        : p.startsWith('/studio')
        ? 'studio'
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
  }, [currentView, refreshAvailableDocs])

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

  const flushSessionBuffer = useCallback(
    (targetChatId, assistantId) => {
      const buf = sessionBuffersRef.current.get(targetChatId)
      if (!buf) return
      if (buf.raf) {
        cancelAnimationFrame(buf.raf)
        buf.raf = 0
      }
      if (!buf.text) return
      const chunkText = buf.text
      buf.text = ''
      patchSessionMessages(targetChatId, (prev) =>
        patchById(prev, assistantId, (m) => ({
          ...m,
          content: (m.content ?? '') + chunkText,
        })),
      )
    },
    [patchSessionMessages],
  )

  useEffect(
    () => () => {
      sessionBuffersRef.current.forEach((buf) => {
        if (buf.raf) cancelAnimationFrame(buf.raf)
      })
      sessionStreamsRef.current.forEach((st) => {
        st.controller?.abort()
      })
    },
    [],
  )

  // Load persisted chat sessions from backend on startup and merge without dropping local sessions
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
        const merged = mergeSessions(loadSessions(), mapped)
        setSessions(merged)
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
    setInput('')
    setAttachedFile(null)
    applyDoc(null, null)
    setAttachedDocs([])
    setMessages([])
    setStructureExplorerOpen(false)

    try {
      const { chat_id } = await createChat()
      setChatId(chat_id)
      saveActiveChatId(chat_id)
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
  }, [applyDoc, handleNavigate])

  const handleStop = useCallback(() => {
    if (!chatId) return
    const activeStream = sessionStreamsRef.current.get(chatId)
    if (activeStream?.controller) {
      activeStream.controller.abort()
    }
  }, [chatId])

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
      setInput('')
      setAttachedFile(null)
      setMobileSidebarOpen(false)
      handleNavigate('chat')
      setChatId(session.chatId)
      saveActiveChatId(session.chatId)

      // Clear unread red dot if this session completed in the background
      setUnreadSessionIds((prev) => {
        if (!prev.has(session.chatId)) return prev
        const next = new Set(prev)
        next.delete(session.chatId)
        return next
      })
      setCenterNotice((prev) => (prev?.chatId === session.chatId ? null : prev))

      // 1. Immediately display cached messages so there is zero flicker / data loss
      const cached = loadChatMessages(session.chatId)
      if (cached && cached.length > 0) {
        setMessages(cached)
      }

      try {
        // 2. Fetch isolated chat history from backend
        const data = await fetchChatHistory(session.chatId)
        if (data?.history && data.history.length > 0) {
          const serverMsgs = mapHistoryToMessages(data.history)
          setMessages(serverMsgs)
          saveChatMessages(session.chatId, serverMsgs)
        } else if (!cached || cached.length === 0) {
          setMessages([])
        }

        // 3. Fetch isolated attached documents for this specific session
        const docsData = await fetchChatDocs(session.chatId)
        const currentDocs = docsData?.documents || []
        setAttachedDocs(currentDocs)
        attachedDocsByChatRef.current.set(session.chatId, currentDocs)

        const isCurrentlyBusy = BUSY_STATUSES.has(sessionStatuses[session.chatId])
        if (!isCurrentlyBusy) {
          if (currentDocs.length > 0) {
            applyDoc(currentDocs[0].doc_id, currentDocs[0].filename)
            setSessionStatus(session.chatId, 'ready')
          } else {
            applyDoc(null, null)
            setSessionStatus(session.chatId, 'idle')
          }
        } else if (currentDocs.length > 0) {
          applyDoc(currentDocs[0].doc_id, currentDocs[0].filename)
        }
      } catch (e) {
        console.warn('Backend load failed, preserving local session data:', e)
        if (!cached || cached.length === 0) {
          setMessages([])
          setAttachedDocs([])
          applyDoc(null, null)
        }
      }
    },
    [applyDoc, handleNavigate, sessionStatuses, setSessionStatus],
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
        setSessionStatus(chatId, 'ready')
        toast.success(`Attached "${doc.filename}" to session`)
      } catch (err) {
        toast.error('Failed to attach document')
      }
    },
    [chatId, applyDoc, setSessionStatus],
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
            setSessionStatus(chatId, 'idle')
          }
          return next
        })
        toast.info('Document detached from session')
      } catch (err) {
        toast.error('Failed to detach document')
      }
    },
    [chatId, applyDoc, setSessionStatus],
  )

  /**
   * One assistant turn: upload/index if needed, then streamed /ask with multi-doc telemetry.
   */
  const processTurn = useCallback(
    async ({ assistantId, userId, entry, chatId: cid }) => {
      const controller = new AbortController()
      sessionStreamsRef.current.set(cid, { controller, assistantId, entry })
      const { signal } = controller

      const patchAssistant = (fn) =>
        patchSessionMessages(cid, (prev) => patchById(prev, assistantId, fn))
      const patchUser = (fn) => {
        if (userId) patchSessionMessages(cid, (prev) => patchById(prev, userId, fn))
      }
      const steps = (op) => patchAssistant((m) => ({ ...m, steps: op(m.steps ?? []) }))

      let phase = entry.file ? 'upload' : 'ask'
      let gotFirst = false

      try {
        // ---- A. Upload + index ----
        if (entry.file) {
          const file = entry.file
          setSessionStatus(cid, 'uploading')
          steps((s) => activateStep(s, STEP.UPLOAD, `Uploading ${file.name}`))

          const res = await uploadDocument(file, cid, {
            signal,
            onSent: () => {
              steps((s) => completeStep(s, STEP.UPLOAD, undefined, 'Document uploaded'))
            },
          })

          const targetDocId = res.document_id || res.doc_id
          if (currentChatIdRef.current === cid) {
            applyDoc(targetDocId, file.name)
          }
          attachDocumentToChat(cid, targetDocId).catch(() => {})

          const newDocObj = {
            doc_id: targetDocId,
            filename: file.name,
            page_count: res.page_count || 1,
            status: res.status || 'ready',
          }

          const existingDocs = attachedDocsByChatRef.current.get(cid) || []
          const nextDocs = existingDocs.some((d) => d.doc_id === targetDocId)
            ? existingDocs
            : [...existingDocs, newDocObj]
          attachedDocsByChatRef.current.set(cid, nextDocs)
          if (currentChatIdRef.current === cid) {
            setAttachedDocs(nextDocs)
          }
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
            setSessionStatus(cid, 'indexing')
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

          setSessionStatus(cid, 'ready')
          entry.file = null
          phase = 'ask'
        }

        // ---- B. Ask with real retrieval telemetry stages ----
        const chatDocs =
          attachedDocsByChatRef.current.get(cid) ||
          (currentChatIdRef.current === cid ? attachedDocs : [])
        const currentDocIds = chatDocs.map((d) => d.doc_id)
        if (docRef.current.id && !currentDocIds.includes(docRef.current.id)) {
          currentDocIds.push(docRef.current.id)
        }

        setSessionStatus(cid, 'retrieving')
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
            if (stageInfo?.stage === 'web_search') {
              patchAssistant((m) => {
                let currentSteps = m.steps ?? []
                currentSteps = activateStep(
                  currentSteps,
                  STEP.RETRIEVE,
                  'Searching live web via FastMCP...',
                )
                return { ...m, steps: currentSteps }
              })
            }
            if (stageInfo?.stage === 'web_search_done') {
              patchAssistant((m) => {
                let currentSteps = m.steps ?? []
                const resCount = stageInfo.results ?? 0
                currentSteps = completeStep(
                  currentSteps,
                  STEP.RETRIEVE,
                  undefined,
                  `FastMCP: ${resCount} web sources found`,
                )
                return { ...m, steps: currentSteps }
              })
            }
            if (stageInfo?.stage === 'retrieved' && !retrievalFinished) {
              retrievalFinished = true
              setSessionStatus(cid, 'generating')
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
              setSessionStatus(cid, 'streaming')
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
            let buf = sessionBuffersRef.current.get(cid)
            if (!buf) {
              buf = { text: '', raf: 0 }
              sessionBuffersRef.current.set(cid, buf)
            }
            buf.text += chunk
            if (!buf.raf) {
              buf.raf = requestAnimationFrame(() => {
                flushSessionBuffer(cid, assistantId)
              })
            }
          },
        })

        flushSessionBuffer(cid, assistantId)

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

        setSessionStatus(cid, currentDocIds.length > 0 ? 'ready' : 'idle')

        // If completed in background while user was on another session, notify user!
        if (currentChatIdRef.current !== cid) {
          setUnreadSessionIds((prev) => new Set(prev).add(cid))
          const currentSessions = sessionsRef.current || []
          const found = currentSessions.find((s) => s.chatId === cid)
          const sessionTitle = found?.title || entry.query?.slice(0, 30) || 'Research'
          setCenterNotice({
            id: crypto.randomUUID(),
            chatId: cid,
            title: sessionTitle,
          })
        }
      } catch (err) {
        flushSessionBuffer(cid, assistantId)
        if (isAbort(err)) {
          patchAssistant((m) => ({
            ...m,
            status: 'aborted',
            steps: (m.steps ?? []).map((st) =>
              st.status === 'in_progress' ? { ...st, status: 'completed' } : st,
            ),
          }))
          setSessionStatus(cid, 'idle')
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
        setSessionStatus(cid, 'error')
        toast.error(msg)
      } finally {
        sessionStreamsRef.current.delete(cid)
        sessionBuffersRef.current.delete(cid)
      }
    },
    [
      applyDoc,
      attachedDocs,
      flushSessionBuffer,
      patchSessionMessages,
      pollDocumentUntilReady,
      refreshAvailableDocs,
      setSessionStatus,
    ],
  )

  const handleSend = useCallback(
    async (textOrOpts, fileOrOpts = null) => {
      let q = ''
      let deepAnalysis = false
      let fileToSend = attachedFile

      if (typeof textOrOpts === 'string') {
        q = textOrOpts.trim()
        if (fileOrOpts instanceof File) {
          fileToSend = fileOrOpts
        } else if (fileOrOpts && typeof fileOrOpts === 'object') {
          deepAnalysis = Boolean(fileOrOpts.deepAnalysis)
        }
      } else if (textOrOpts && typeof textOrOpts === 'object') {
        q = input.trim()
        deepAnalysis = Boolean(textOrOpts.deepAnalysis)
        if (fileOrOpts instanceof File) {
          fileToSend = fileOrOpts
        }
      } else {
        q = input.trim()
      }

      if (!q && !fileToSend) return
      if (BUSY_STATUSES.has(agentStatus)) return

      let cid = chatId
      if (!cid) {
        try {
          const { chat_id } = await createChat()
          cid = chat_id
          setChatId(chat_id)
          saveActiveChatId(chat_id)
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
        deepAnalysis: Boolean(deepAnalysis),
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

      const nextMessages = [...messages, userBubble, assistantBubble]
      setMessages(nextMessages)
      saveChatMessages(cid, nextMessages)
      setInput('')
      setAttachedFile(null)

      processTurn({
        assistantId: assistantMsgId,
        userId: userMsgId,
        entry,
        chatId: cid,
      })
    },
    [agentStatus, attachedFile, chatId, input, messages, processTurn],
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
      setSessionStatus(chatId, 'idle')
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
        if (remaining.length > 0) {
          handleSelectSession(remaining[0])
        } else {
          handleNewChat()
        }
      }
      try {
        await deleteChat(sessionId)
      } catch (e) {
        console.warn('Backend delete failed:', e)
      }
      toast.success('Conversation deleted.')
    },
    [chatId, handleNewChat, handleSelectSession],
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

  // Start research from Document Library: always create a fresh chat session
  const handleSelectDocumentForChat = useCallback(
    async (targetDocId, targetDocName, initialPrompt) => {
      setInput(initialPrompt || '')
      setAttachedFile(null)
      applyDoc(targetDocId, targetDocName)
      setAttachedDocs([{ doc_id: targetDocId, filename: targetDocName, status: 'ready' }])
      setMessages([])
      setStructureExplorerOpen(false)
      handleNavigate('chat')

      try {
        const { chat_id } = await createChat()
        setChatId(chat_id)
        saveActiveChatId(chat_id)
        setSessionStatus(chat_id, 'ready')
        attachDocumentToChat(chat_id, targetDocId).catch(() => {})
        setSessions(
          upsertSession({
            chatId: chat_id,
            docId: targetDocId,
            docName: targetDocName,
            title: `Research: ${targetDocName}`,
            updatedAt: Date.now(),
          }),
        )
      } catch (err) {
        console.error('Failed to create new chat session:', err)
        toast.error('Failed to initialize research session.')
      }

      toast.success(`Started new research session for "${targetDocName}".`)
    },
    [applyDoc, handleNavigate, setSessionStatus],
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
      unreadSessionIds={unreadSessionIds}
      sessionStatuses={sessionStatuses}
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
    <>
      <CenterNotification
        notice={centerNotice}
        onView={(targetChatId) => {
          const s = sessionsRef.current.find((x) => x.chatId === targetChatId)
          if (s) {
            handleSelectSession(s)
          } else {
            handleSelectSession({ chatId: targetChatId, title: 'Research' })
          }
        }}
        onDismiss={() => setCenterNotice(null)}
      />

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
        ) : currentView === 'studio' ? (
          <StudyStudioView
            docId={docId || attachedDocs[0]?.doc_id}
            availableDocs={availableDocs}
            onSelectDoc={(id) => {
              const matchingDoc = availableDocs.find((d) => d.doc_id === id)
              applyDoc(id, matchingDoc?.filename || 'Document')
              loadDocTree(id)
            }}
            onJumpToSection={(targetDocId, sectionTitle, pageNumber, targetNodeId) => {
              const activeId = targetDocId || docRef.current.id || attachedDocs[0]?.doc_id
              if (activeId) {
                const matchingDoc = availableDocs.find((d) => d.doc_id === activeId)
                applyDoc(activeId, matchingDoc?.filename || 'Document')
                loadDocTree(activeId)
              }
              if (targetNodeId) {
                setActiveTreeNodeId(targetNodeId)
              }
              setStructureExplorerOpen(true)
            }}
            onAskAboutConcept={(concept) => {
              handleNavigate('chat')
              setInput(`Explain the core concept "${concept}" and cite its principles from the document.`)
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
    </>
  )
}
