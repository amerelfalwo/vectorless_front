import axios from 'axios'
import { API_BASE_URL } from '../config.js'

/**
 * JSON endpoints use axios. Streaming `/ask` uses `fetch` (see `streamAsk`) because
 * axios does not expose ReadableStream as cleanly for incremental UI updates.
 * If the browser reports CORS errors on streaming, enable CORSMiddleware on the
 * FastAPI app (including exposed headers for SSE if needed).
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' },
})

/**
 * @param {File} file
 * @param {string} [chatId]
 * @param {{ onSent?: () => void }} [opts] onSent fires once the file bytes have been fully sent
 *   (the server is then indexing; the response arrives when indexing is finished).
 * @returns {Promise<{ doc_id: string, message?: string, filename?: string, status?: string, page_count?: number }>}
 */
export async function uploadDocument(file, chatId, opts = {}) {
  const formData = new FormData()
  formData.append('file', file)
  if (chatId) {
    formData.append('chat_id', chatId)
  }
  let sentFired = false
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal: opts.signal,
    onUploadProgress: (e) => {
      if (!sentFired && e.total && e.loaded >= e.total) {
        sentFired = true
        opts.onSent?.()
      }
    },
  })
  return data
}

/**
 * @returns {Promise<{ chat_id: string }>}
 */
export async function createChat() {
  const { data } = await api.post('/chat/new', {})
  return data
}

/**
 * @param {string} chatId
 * @returns {Promise<{ history: { role: string, content: string }[] }>}
 */
export async function fetchChatHistory(chatId) {
  const { data } = await api.get(`/chat/${encodeURIComponent(chatId)}/history`)
  return data
}

/**
 * @param {string} chatId
 * @param {string} docId
 * @returns {Promise<{ message: string, chat_id: string, doc_id: string }>}
 */
export async function attachDocumentToChat(chatId, docId) {
  const { data } = await api.post(`/chat/${encodeURIComponent(chatId)}/attach`, {
    doc_id: docId,
  })
  return data
}

/**
 * @param {string} chatId
 * @returns {Promise<{ message: string, chat_id: string }>}
 */
export async function detachDocumentFromChat(chatId) {
  const { data } = await api.delete(`/chat/${encodeURIComponent(chatId)}/document`)
  return data
}

/**
 * @returns {Promise<{ chats: Array<{ chat_id, title, doc_id, doc_name, created_at, updated_at }> }>}
 */
export async function listChats() {
  const { data } = await api.get('/chats')
  return data
}

/**
 * @param {string} chatId
 * @returns {Promise<{ message: string }>}
 */
export async function deleteChat(chatId) {
  const { data } = await api.delete(`/chat/${encodeURIComponent(chatId)}`)
  return data
}

/**
 * @param {string} chatId
 * @param {string} title
 * @returns {Promise<{ message: string, title: string }>}
 */
export async function renameChat(chatId, title) {
  const { data } = await api.patch(`/chat/${encodeURIComponent(chatId)}/title`, { title })
  return data
}

/**
 * Stream assistant tokens from POST /ask using fetch + ReadableStream.
 * Supports SSE `data:` lines, stage event markers, and raw incremental text.
 *
 * @param {{
 *   doc_id?: string,
 *   doc_name?: string,
 *   chat_id: string,
 *   query: string,
 *   deep_analysis?: boolean,
 *   signal?: AbortSignal,
 *   onDelta: (chunk: string) => void,
 *   onStage?: (stage: { stage: string, duration?: number, nodes?: number }) => void
 * }} opts
 */
export async function streamAsk({
  doc_id,
  doc_name,
  chat_id,
  query,
  deep_analysis,
  signal,
  onDelta,
  onStage,
}) {
  const res = await fetch(`${API_BASE_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ doc_id, doc_name, chat_id, query, deep_analysis }),
    signal,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(errText || `Request failed (${res.status})`)
  }

  const reader = res.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder('utf-8')
  let carry = ''
  let sawDataPrefix = false

  const stageRegex = /<!--STAGE:(.*?)-->\n?/g

  const handleStageAndDelta = (rawChunk) => {
    let text = rawChunk
    let match
    while ((match = stageRegex.exec(text)) !== null) {
      try {
        const stageData = JSON.parse(match[1])
        onStage?.(stageData)
      } catch (err) {
        console.warn('Failed to parse stage marker', err)
      }
    }
    stageRegex.lastIndex = 0
    text = text.replace(stageRegex, '')
    if (text) {
      onDelta(text)
    }
  }

  const flushLine = (line) => {
    const trimmedEnd = line.replace(/\r$/, '')
    if (trimmedEnd.startsWith('data:')) {
      sawDataPrefix = true
      const payload = trimmedEnd.slice(5).trimStart()
      if (payload === '[DONE]' || payload === '') return
      handleStageAndDelta(payload)
      return
    }
    if (sawDataPrefix) return
    if (trimmedEnd === '') return
    handleStageAndDelta(trimmedEnd + '\n')
  }

  const pushText = (text) => {
    // If stream is raw chunks without data: prefixes, forward immediately without buffering until newline
    if (!sawDataPrefix && !text.includes('data:')) {
      handleStageAndDelta(text)
      return
    }
    carry += text
    const parts = carry.split('\n')
    carry = parts.pop() ?? ''
    for (const part of parts) flushLine(part)
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) pushText(decoder.decode(value, { stream: true }))
    }
    pushText(decoder.decode())
    if (carry) {
      if (sawDataPrefix && carry.startsWith('data:')) flushLine(carry)
      else if (!sawDataPrefix) handleStageAndDelta(carry)
      else if (carry.trim()) flushLine(carry)
    }
  } finally {
    reader.releaseLock?.()
  }
}
