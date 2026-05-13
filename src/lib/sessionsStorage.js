const STORAGE_KEY = 'vectorless_rag_sessions_v1'

/**
 * @typedef {{ chatId: string, docId: string, title: string, updatedAt: number }} ChatSession
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

/** @param {ChatSession} session */
export function upsertSession(session) {
  const list = loadSessions().filter((s) => s.chatId !== session.chatId)
  list.push(session)
  list.sort((a, b) => b.updatedAt - a.updatedAt)
  saveSessions(list)
  return list
}

/** @param {string} chatId @param {Partial<Pick<ChatSession, 'title' | 'updatedAt'>>} patch */
export function patchSession(chatId, patch) {
  const list = loadSessions()
  const idx = list.findIndex((s) => s.chatId === chatId)
  if (idx === -1) return list
  list[idx] = { ...list[idx], ...patch }
  list.sort((a, b) => b.updatedAt - a.updatedAt)
  saveSessions(list)
  return list
}
