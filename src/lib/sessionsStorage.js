const STORAGE_KEY = 'vectorless_rag_sessions_v1'
const ACTIVE_CHAT_KEY = 'vectorless_rag_active_chat_v1'
const MESSAGES_PREFIX = 'vectorless_rag_messages_v1_'

/**
 * @typedef {{ chatId: string, docId?: string | null, docName?: string | null, title: string, updatedAt: number }} ChatSession
 */

/** @returns {ChatSession[]} */
export function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** @param {ChatSession[]} sessions */
export function saveSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch (e) {
    console.warn('Failed to save sessions to localStorage:', e)
  }
}

/** @returns {string | null} */
export function loadActiveChatId() {
  try {
    return localStorage.getItem(ACTIVE_CHAT_KEY) || null
  } catch {
    return null
  }
}

/** @param {string | null} chatId */
export function saveActiveChatId(chatId) {
  try {
    if (chatId) {
      localStorage.setItem(ACTIVE_CHAT_KEY, chatId)
    } else {
      localStorage.removeItem(ACTIVE_CHAT_KEY)
    }
  } catch (e) {
    console.warn('Failed to save active chat ID:', e)
  }
}

/** @param {string} chatId */
export function loadChatMessages(chatId) {
  if (!chatId) return []
  try {
    const raw = localStorage.getItem(`${MESSAGES_PREFIX}${chatId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** @param {string} chatId @param {any[]} messages */
export function saveChatMessages(chatId, messages) {
  if (!chatId || !Array.isArray(messages)) return
  try {
    localStorage.setItem(`${MESSAGES_PREFIX}${chatId}`, JSON.stringify(messages))
  } catch (e) {
    console.warn('Failed to save chat messages:', e)
  }
}

/** @param {string} chatId */
export function deleteChatMessages(chatId) {
  if (!chatId) return
  try {
    localStorage.removeItem(`${MESSAGES_PREFIX}${chatId}`)
  } catch {}
}

/**
 * Merges local sessions with remote sessions from backend.
 * Never drops any existing session.
 * @param {ChatSession[]} localSessions
 * @param {ChatSession[]} remoteSessions
 * @returns {ChatSession[]}
 */
export function mergeSessions(localSessions, remoteSessions) {
  const map = new Map()
  ;(localSessions || []).forEach((s) => {
    if (s?.chatId) map.set(s.chatId, s)
  })
  ;(remoteSessions || []).forEach((s) => {
    if (s?.chatId) {
      const existing = map.get(s.chatId)
      map.set(s.chatId, {
        ...existing,
        ...s,
        title:
          s.title && s.title !== 'New research'
            ? s.title
            : existing?.title || s.title || 'New research',
        docId: s.docId || existing?.docId || null,
        docName: s.docName || existing?.docName || null,
        updatedAt: Math.max(s.updatedAt || 0, existing?.updatedAt || 0) || Date.now(),
      })
    }
  })
  const merged = Array.from(map.values())
  merged.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  saveSessions(merged)
  return merged
}

/** @param {ChatSession} session */
export function upsertSession(session) {
  const list = loadSessions().filter((s) => s.chatId !== session.chatId)
  list.push(session)
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  saveSessions(list)
  return list
}

/** @param {string} chatId @param {Partial<Pick<ChatSession, 'title' | 'updatedAt' | 'docId' | 'docName'>>} patch */
export function patchSession(chatId, patch) {
  const list = loadSessions()
  const idx = list.findIndex((s) => s.chatId === chatId)
  if (idx === -1) return list
  list[idx] = { ...list[idx], ...patch }
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  saveSessions(list)
  return list
}

/** @param {string} chatId */
export function deleteSession(chatId) {
  deleteChatMessages(chatId)
  const list = loadSessions().filter((s) => s.chatId !== chatId)
  saveSessions(list)
  return list
}
