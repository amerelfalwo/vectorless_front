import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble.jsx'

/**
 * @param {{ messages: { id: string, role: 'user' | 'assistant', content: string }[] }} props
 */
export function MessageList({ messages }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 pb-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} role={m.role} content={m.content} />
        ))}
        <div ref={bottomRef} className="h-1 shrink-0" aria-hidden />
      </div>
    </div>
  )
}
