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
 * @returns {Promise<{ doc_id: string, message?: string }>}
 */
export async function uploadDocument(file) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
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
 * Stream assistant tokens from POST /ask using fetch + ReadableStream.
 * Supports SSE `data:` lines and plain incremental text (no `data:` prefix).
 *
 * @param {{ doc_id: string, chat_id: string, query: string, signal?: AbortSignal, onDelta: (chunk: string) => void }} opts
 */
export async function streamAsk({
  doc_id,
  chat_id,
  query,
  signal,
  onDelta,
}) {
  const res = await fetch(`${API_BASE_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ doc_id, chat_id, query }),
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

  const flushLine = (line) => {
    const trimmedEnd = line.replace(/\r$/, '')
    if (trimmedEnd.startsWith('data:')) {
      sawDataPrefix = true
      const payload = trimmedEnd.slice(5).trimStart()
      if (payload === '[DONE]' || payload === '') return
      onDelta(payload)
      return
    }
    if (sawDataPrefix) return
    if (trimmedEnd === '') return
    onDelta(trimmedEnd + '\n')
  }

  const pushText = (text) => {
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
      else if (!sawDataPrefix) onDelta(carry)
      else if (carry.trim()) flushLine(carry)
    }
  } finally {
    reader.releaseLock?.()
  }
}
