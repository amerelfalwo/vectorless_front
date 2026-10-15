import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { MessageBubble } from './MessageBubble.jsx'

const NEAR_BOTTOM_PX = 120

/**
 * Message list with non-intrusive auto-scroll
 *
 * @param {{
 *   messages: any[],
 *   busy: boolean,
 *   onRetry?: (id: string) => void,
 *   onSelectCitation?: (source: any) => void,
 * }} props
 */
export function MessageList({ messages, busy, onRetry, onSelectCitation }) {
  const scrollerRef = useRef(null)
  const stickRef = useRef(true)
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

  // Content changed: follow only if the user is already at the bottom
  useEffect(() => {
    if (stickRef.current) scrollToBottom(false)
  }, [messages, scrollToBottom])

  // A brand-new user turn always re-sticks
  const lastUserId = [...messages].reverse().find((m) => m.role === 'user')?.id
  useEffect(() => {
    if (!lastUserId) return
    stickRef.current = true
    scrollToBottom(true)
  }, [lastUserId, scrollToBottom])

  const lastId = messages[messages.length - 1]?.id

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-[#F7F6F1]">
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 md:px-8 scrollbar-thin"
        role="log"
        aria-label="Research Conversation"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-2 pb-6">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isLast={m.id === lastId}
              busy={busy}
              onRetry={onRetry}
              onSelectCitation={onSelectCitation}
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
          className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#E4E5DE] bg-white px-3 py-1.5 text-xs font-medium text-[#262B27] shadow-md transition hover:bg-[#F7F6F1]"
        >
          <ArrowDown className="h-3.5 w-3.5 text-[#285943]" aria-hidden />
          <span>New research content</span>
        </button>
      ) : null}
    </div>
  )
}
