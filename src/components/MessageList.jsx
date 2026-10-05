import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { MessageBubble } from './MessageBubble.jsx'

const NEAR_BOTTOM_PX = 120

/**
 * Message list with non-intrusive auto-scroll:
 *  - follows the stream only while the user is within NEAR_BOTTOM_PX of the bottom
 *  - once the user scrolls up it stops, and shows a "New content" button
 *
 * @param {{
 *   messages: any[],
 *   busy: boolean,
 *   onRetry?: (id: string) => void,
 * }} props
 */
export function MessageList({ messages, busy, onRetry }) {
  const scrollerRef = useRef(null)
  const stickRef = useRef(true)
  // True while the viewport is at/near the bottom. Only changed from event handlers.
  const [stuck, setStuck] = useState(true)
  const showJump = !stuck && busy

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    const near = distance < NEAR_BOTTOM_PX
    stickRef.current = near
    setStuck(near)
  }, [])

  // Content changed: follow only if the user is already at the bottom.
  useEffect(() => {
    if (stickRef.current) scrollToBottom(false)
  }, [messages, scrollToBottom])

  // A brand-new user turn always re-sticks (the user just acted).
  const lastUserId = [...messages].reverse().find((m) => m.role === 'user')?.id
  useEffect(() => {
    if (!lastUserId) return
    stickRef.current = true
    scrollToBottom(true)
  }, [lastUserId, scrollToBottom])

  const lastId = messages[messages.length - 1]?.id

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-8"
        role="log"
        aria-label="Conversation"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-3 pb-4">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isLast={m.id === lastId}
              busy={busy}
              onRetry={onRetry}
            />
          ))}
        </div>
      </div>

      {showJump ? (
        <button
          type="button"
          onClick={() => {
            stickRef.current = true
            setStuck(true)
            scrollToBottom(true)
          }}
          className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/15 bg-[#2a2a2a] px-3 py-1.5 text-xs text-zinc-200 shadow-lg transition hover:bg-[#333]"
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden />
          New content
        </button>
      ) : null}
    </div>
  )
}
