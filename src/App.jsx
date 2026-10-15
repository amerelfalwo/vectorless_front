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
} from './api/client.js'
import { ChatLayout } from './components/ChatLayout.jsx'
import { TopNav } from './components/TopNav.jsx'
import { ChatInput } from './components/ChatInput.jsx'
import { EmptyState } from './components/EmptyState.jsx'
import { MessageList } from './components/MessageList.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import { DocumentLibrary } from './components/DocumentLibrary.jsx'
import { DocumentStructureExplorer } from './components/DocumentStructureExplorer.jsx'
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
    return window.location.pathname.startsWith('/documents') ? 'documents' : 'chat'
  })

  const [docId, setDocId] = useState(null)
  const [docName, setDocName] = useState(null)
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
    const targetPath = view === 'documents' ? '/documents' : '/'
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath)
    }
    setMobileSidebarOpen(false)
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const view = window.location.pathname.startsWith('/documents') ? 'documents' : 'chat'
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
      if (next && docRef.current.id && !documentTree) {
        loadDocTree(docRef.current.id)
      }
      return next
    })
  }, [documentTree, loadDocTree])

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
      handleNavigate('chat')

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
        toast.error('Failed to load conversation history.')
      }
    },
    [applyDoc, handleNavigate, pollDocumentUntilReady],
  )


  /**
   * One assistant turn: upload/index if needed, then streamed /ask with telemetry.
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
        const activeDocId = docRef.current.id
        if (activeDocId) {
          try {
            const st = await fetchDocumentStatus(activeDocId, { signal })
            if (st.status === 'indexing') {
              setAgentStatus('indexing')
              steps((s) => activateStep(s, STEP.INDEX, st.current_stage || 'Processing document'))
              await pollDocumentUntilReady(activeDocId, {
                signal,
                onProgress: (info) => {
                  steps((s) => updateStep(s, STEP.INDEX, info.current_stage || 'Processing'))
                },
              })
              steps((s) => completeStep(s, STEP.INDEX, undefined, 'Index ready'))
            } else if (st.status === 'failed') {
              setAgentStatus('indexing')
              steps((s) => activateStep(s, STEP.INDEX, 'Re-indexing'))
              await retryDocumentIndexing(activeDocId, { signal })
              await pollDocumentUntilReady(activeDocId, {
                signal,
                onProgress: (info) => {
                  steps((s) => updateStep(s, STEP.INDEX, info.current_stage || 'Processing'))
                },
              })
              steps((s) => completeStep(s, STEP.INDEX, undefined, 'Index ready'))
            }
          } catch (err) {
            if (isAbort(err)) throw err
          }
        }

        setAgentStatus('retrieving')
        // Progress through real retrieval stages
        steps((s) => activateStep(s, STEP.UNDERSTAND, 'Analyzing question requirements'))
        patchAssistant((m) => ({ ...m, status: 'pending' }))

        // Transition to document tree exploration
        setTimeout(() => {
          steps((s) => {
            const s1 = completeStep(s, STEP.UNDERSTAND, undefined, 'Question analyzed')
            return activateStep(s1, STEP.EXPLORE, 'Traversing document section hierarchy')
          })
        }, 150)

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
              const nodesMatched = stageInfo.nodes != null ? stageInfo.nodes : undefined

              patchAssistant((m) => {
                let currentSteps = m.steps ?? []
                currentSteps = completeStep(currentSteps, STEP.EXPLORE, undefined, 'Document structure traversed')
                currentSteps = completeStep(
                  currentSteps,
                  STEP.SELECT,
                  undefined,
                  nodesMatched ? `${nodesMatched} relevant sections selected` : 'Sections selected',
                )
                currentSteps = completeStep(
                  currentSteps,
                  STEP.RETRIEVE,
                  durationMs,
                  'Supporting evidence retrieved',
                )
                currentSteps = activateStep(currentSteps, STEP.GENERATE, 'Synthesizing grounded answer')
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
        if (!gotFirst) throw new Error('The server returned an empty response.')
        patchAssistant((m) => ({
          ...m,
          status: 'completed',
          completedAt: Date.now(),
          steps: completeStep(
            completeStep(m.steps ?? [], STEP.RETRIEVE),
            STEP.GENERATE,
            undefined,
            'Final response generated',
          ),
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
    [applyDoc, flushNow, pollDocumentUntilReady],
  )

  // Send message
  const handleSend = useCallback(
    async (opts = {}) => {
      const query = input.trim()
      const fileToUpload = attachedFile
      const deepAnalysis = Boolean(opts?.deepAnalysis)

      if ((!query && !fileToUpload) || busy) return

      setInput('')
      setAttachedFile(null)

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
                  : 'New research',
              updatedAt: Date.now(),
            }),
          )
        } catch (err) {
          console.error(err)
          toast.error('Failed to start chat.')
          setInput(query)
          setAttachedFile(fileToUpload)
          return
        }
      }

      if (!docRef.current.id) {
        const sess = loadSessions().find((s) => s.chatId === activeChatId)
        if (sess?.docId) applyDoc(sess.docId, sess.docName ?? null)
      }

      const userText =
        query || (fileToUpload ? 'Please summarize the main arguments in this document.' : '')
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

      const current = loadSessions().find((s) => s.chatId === activeChatId)
      if (current && (current.title === 'New research' || current.title === 'New chat')) {
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
    },
    [input, attachedFile, busy, chatId, applyDoc, processTurn],
  )

  // Retry turn
  const handleRetry = useCallback(
    async (assistantId) => {
      if (busy) return
      const idx = messages.findIndex((m) => m.id === assistantId)
      if (idx === -1) return

      let entry = turnsRef.current.get(assistantId)
      if (!entry) {
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

  // Detach document
  const handleDetachDocument = useCallback(async () => {
    if (!chatId) return
    try {
      await detachDocumentFromChat(chatId)
      applyDoc(null, null)
      setAgentStatus('idle')
      setStructureExplorerOpen(false)
      setSessions(
        patchSession(chatId, {
          docId: null,
          docName: null,
          updatedAt: Date.now(),
        }),
      )
      toast.info('Document detached. Switched back to general conversation.')
    } catch (e) {
      console.error(e)
      toast.error('Failed to detach document.')
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
      if (!docRef.current.id) return
      setStructureExplorerOpen(true)
      if (!documentTree) {
        await loadDocTree(docRef.current.id)
      }
      // Look for matching node
      if (source?.title) {
        setActiveTreeNodeId(source.title)
      }
    },
    [documentTree, loadDocTree],
  )

  // Current session title for TopNav
  const currentSessionTitle = useMemo(() => {
    if (currentView === 'documents') return 'Document Library'
    const s = sessions.find((item) => item.chatId === chatId)
    return s?.title || 'Research Workspace'
  }, [currentView, sessions, chatId])

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
      currentView={currentView}
      onNavigate={handleNavigate}
    />
  )

  const topNav = (
    <TopNav
      title={currentSessionTitle}
      activeDocId={docId}
      activeDocName={docName}
      activeDocStatus={agentStatus}
      onDetachDoc={handleDetachDocument}
      onToggleStructureExplorer={docId ? toggleStructureExplorer : undefined}
      structureExplorerOpen={structureExplorerOpen}
      onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
      currentView={currentView}
      onNavigate={handleNavigate}
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

  const structureExplorerNode =
    structureExplorerOpen && docId ? (
      <DocumentStructureExplorer
        tree={documentTree || []}
        docName={docName || 'Document'}
        docId={docId}
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
      topNav={topNav}
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
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F7F6F1]">
          {messages.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto p-4">
              <EmptyState onPick={setInput} docName={docName} />
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
