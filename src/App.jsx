import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  createChat,
  fetchChatHistory,
  streamAsk,
  uploadDocument,
} from './api/client.js'
import { ChatLayout } from './components/ChatLayout.jsx'
import { ChatInput } from './components/ChatInput.jsx'
import { EmptyStateDropzone } from './components/EmptyStateDropzone.jsx'
import { MessageList } from './components/MessageList.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import {
  loadSessions,
  patchSession,
  upsertSession,
} from './lib/sessionsStorage.js'

function mapHistoryToMessages(history) {
  return (history ?? []).map((row) => ({
    id: crypto.randomUUID(),
    role: row.role === 'user' ? 'user' : 'assistant',
    content: row.content ?? '',
  }))
}

export default function App() {
  const [docId, setDocId] = useState(null)
  const [chatId, setChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [sessions, setSessions] = useState(() => loadSessions())
  const [input, setInput] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [documentUploaded, setDocumentUploaded] = useState(false)
  const [uploadSessionId, setUploadSessionId] = useState(0)
  const [isStreaming, setIsStreaming] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const streamAbortRef = useRef(null)

  const resetForNewDocument = useCallback(() => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    setDocId(null)
    setChatId(null)
    setMessages([])
    setInput('')
    setIsStreaming(false)
  }, [])

  const handleBeforePickFile = useCallback(() => {
    resetForNewDocument()
  }, [resetForNewDocument])

  const handleFileSelected = useCallback(async (file) => {
    setUploadSessionId((s) => s + 1)
    setDocumentUploaded(false)
    setIsUploading(true)
    try {
      const { doc_id } = await uploadDocument(file)
      setDocumentUploaded(true)
      setDocId(doc_id)
      const { chat_id } = await createChat()
      setChatId(chat_id)
      setMessages([])
      const session = {
        chatId: chat_id,
        docId: doc_id,
        title: 'New chat',
        updatedAt: Date.now(),
      }
      setSessions(upsertSession(session))
      toast.success("Document indexed! You're ready to chat.")
    } catch (e) {
      console.error(e)
      const msg =
        e instanceof Error ? e.message : 'Upload failed. Please try again.'
      toast.error(msg)
      resetForNewDocument()
    } finally {
      setIsUploading(false)
      setDocumentUploaded(false)
    }
  }, [resetForNewDocument])

  const handleNewChat = useCallback(async () => {
    if (!docId || isStreaming) return
    try {
      const { chat_id } = await createChat()
      setChatId(chat_id)
      setMessages([])
      setSessions(
        upsertSession({
          chatId: chat_id,
          docId,
          title: 'New chat',
          updatedAt: Date.now(),
        }),
      )
      setMobileSidebarOpen(false)
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : 'Could not start a new chat.')
    }
  }, [docId, isStreaming])

  const handleSelectSession = useCallback(
    async (session) => {
      streamAbortRef.current?.abort()
      streamAbortRef.current = null
      setIsStreaming(false)
      setDocId(session.docId)
      setChatId(session.chatId)
      setInput('')
      setMobileSidebarOpen(false)
      try {
        const data = await fetchChatHistory(session.chatId)
        setMessages(mapHistoryToMessages(data.history))
      } catch (e) {
        console.error(e)
        setMessages([])
        toast.error(
          e instanceof Error ? e.message : 'Could not load chat history.',
        )
      }
    },
    [],
  )

  const handleStop = useCallback(() => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    setIsStreaming(false)
  }, [])

  const handleSend = useCallback(async () => {
    const query = input.trim()
    if (!docId || !chatId || !query || isStreaming) return

    const userMessage = { id: crypto.randomUUID(), role: 'user', content: query }
    const assistantId = crypto.randomUUID()
    const assistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
    }

    setInput('')
    setMessages((prev) => [...prev, userMessage, assistantMessage])

    const sessionList = loadSessions()
    const current = sessionList.find((s) => s.chatId === chatId)
    if (current && current.title === 'New chat') {
      setSessions(patchSession(chatId, { title: query.slice(0, 120), updatedAt: Date.now() }))
    } else {
      setSessions(patchSession(chatId, { updatedAt: Date.now() }))
    }

    const controller = new AbortController()
    streamAbortRef.current = controller
    setIsStreaming(true)

    try {
      await streamAsk({
        doc_id: docId,
        chat_id: chatId,
        query,
        signal: controller.signal,
        onDelta: (chunk) => {
          setMessages((prev) => {
            const next = [...prev]
            const idx = next.findIndex((m) => m.id === assistantId)
            if (idx === -1) return prev
            next[idx] = {
              ...next[idx],
              content: next[idx].content + chunk,
            }
            return next
          })
        },
      })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // user stopped
      } else {
        console.error(e)
        const errText =
          e instanceof Error ? e.message : 'Something went wrong while streaming.'
        toast.error(errText)
        setMessages((prev) => {
          const next = [...prev]
          const idx = next.findIndex((m) => m.id === assistantId)
          if (idx === -1) return prev
          const existing = next[idx].content
          next[idx] = {
            ...next[idx],
            content: existing
              ? `${existing}\n\n**Error:** ${errText}`
              : `**Error:** ${errText}`,
          }
          return next
        })
      }
    } finally {
      setIsStreaming(false)
      streamAbortRef.current = null
    }
  }, [chatId, docId, input, isStreaming])

  const sidebar = (
    <Sidebar
      sessions={sessions}
      activeChatId={chatId}
      hasDocument={Boolean(docId)}
      isStreaming={isStreaming}
      isUploading={isUploading}
      onBeforePickFile={handleBeforePickFile}
      onFileSelected={handleFileSelected}
      onNewChat={handleNewChat}
      onSelectSession={handleSelectSession}
    />
  )

  return (
    <ChatLayout
      sidebar={sidebar}
      mobileSidebarOpen={mobileSidebarOpen}
      onMobileSidebarOpenChange={setMobileSidebarOpen}
    >
      {!docId ? (
        <EmptyStateDropzone
          disabled={false}
          isUploading={isUploading}
          documentUploaded={documentUploaded}
          uploadSessionId={uploadSessionId}
          onFileSelected={handleFileSelected}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {messages.length === 0 ? (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8 text-center text-sm text-zinc-400">
                <p className="max-w-md">
                  Document ready. Ask a question below to retrieve grounded answers with
                  citations.
                </p>
              </div>
            ) : (
              <MessageList messages={messages} />
            )}
          </div>
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onStop={handleStop}
            disabled={!docId}
            isStreaming={isStreaming}
          />
        </div>
      )}
    </ChatLayout>
  )
}
