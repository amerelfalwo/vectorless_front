import { lazy, memo, Suspense, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy, RotateCcw } from 'lucide-react'
import { API_BASE_URL } from '../config.js'
import { extractSources } from '../lib/citations.js'
import { stepLabel } from '../lib/activity.js'
import { AgentActivity } from './AgentActivity.jsx'
import { DocumentCard } from './DocumentCard.jsx'
import { ErrorState } from './ErrorState.jsx'
import { SourceList } from './SourceList.jsx'
import { StreamingCaret, StreamingLabel } from './StreamingIndicator.jsx'
import { VectorlessLogo } from './VectorlessLogo.jsx'

const CodeBlock = lazy(() =>
  import('./CodeBlock.jsx').then((m) => ({ default: m.CodeBlock })),
)

const MARKDOWN_CLASS = [
  'markdown-body max-w-none space-y-3 leading-relaxed text-[#ececec] break-words',
  '[&_p]:my-2 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-semibold',
  '[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold',
  '[&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:ps-5',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:ps-5',
  '[&_li]:my-0.5',
  '[&_blockquote]:border-s-2 [&_blockquote]:border-zinc-500 [&_blockquote]:ps-3 [&_blockquote]:text-zinc-400',
  '[&_a]:text-blue-400 [&_a]:underline',
  '[&_th]:border [&_th]:border-zinc-700 [&_th]:bg-[#171717] [&_th]:px-3 [&_th]:py-2 [&_th]:text-xs [&_th]:font-semibold',
  '[&_td]:border [&_td]:border-zinc-800 [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs',
].join(' ')

// Hoisted so ReactMarkdown receives stable references on every token update.
const REMARK_PLUGINS = [remarkGfm]
const MD_COMPONENTS = {
  // eslint-disable-next-line no-unused-vars
  a: ({ node: _node, ...props }) => <a target="_blank" rel="noopener noreferrer" {...props} />,
  // eslint-disable-next-line no-unused-vars
  img: ({ node: _node, src, alt, ...props }) => {
    const imgSrc = src?.startsWith('/static/') ? `${API_BASE_URL}${src}` : src
    return (
      <img
        src={imgSrc}
        alt={alt}
        loading="lazy"
        className="my-4 h-auto max-w-[80%] rounded-lg shadow-md"
        {...props}
      />
    )
  },
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-white/10 bg-[#171717]/60">
      <table className="w-full min-w-[280px] border-collapse text-start text-xs">{children}</table>
    </div>
  ),
  // eslint-disable-next-line no-unused-vars
  code: ({ node: _node, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '')
    const codeText = String(children).replace(/\n$/, '')
    if (match) {
      return (
        <Suspense fallback={<div className="my-3 h-28 animate-pulse rounded-lg bg-[#171717]" />}>
          <CodeBlock language={match[1]} codeString={codeText} />
        </Suspense>
      )
    }
    return (
      <code
        className="rounded bg-[#171717] px-1.5 py-0.5 font-mono text-[13px] text-zinc-200"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }) => <>{children}</>,
}

/** Markdown body, re-rendered only when its text changes. */
const Markdown = memo(function Markdown({ text }) {
  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={MD_COMPONENTS}>
      {text}
    </ReactMarkdown>
  )
})

const UserMessage = memo(function UserMessage({ content, file }) {
  return (
    <div className="flex w-full flex-col items-end gap-2 py-2">
      {file ? <DocumentCard name={file.name} size={file.size} status={file.status ?? 'ready'} /> : null}
      {content ? (
        <div
          dir="auto"
          className="max-w-[85%] rounded-[24px] bg-[#2f2f2f] px-5 py-3 text-[15px] leading-relaxed text-[#ececec] md:max-w-[70%]"
        >
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </div>
      ) : null}
    </div>
  )
})

/**
 * @param {{
 *   message: any,
 *   isLast: boolean,
 *   busy: boolean,
 *   onRetry?: (id: string) => void,
 * }} props
 */
const AssistantMessage = memo(function AssistantMessage({ message, isLast, busy, onRetry }) {
  const [copied, setCopied] = useState(false)
  const { id, content = '', status = 'completed', steps, error, startedAt, completedAt, details } = message

  const isWorking = status === 'pending' || status === 'streaming'
  const isStreaming = status === 'streaming'
  // Citation parsing is skipped mid-stream to keep token updates cheap.
  const sources = useMemo(() => (isWorking ? [] : extractSources(content)), [content, isWorking])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable (insecure context) - ignore */
    }
  }

  const duration = completedAt && startedAt ? completedAt - startedAt : null
  const canRetry = Boolean(onRetry) && isLast && !busy && !isWorking
  const hasHistoryOnly = !steps?.length

  return (
    <article className="flex w-full gap-3 py-2 text-[15px] leading-relaxed text-[#ececec]" aria-label="Assistant message">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full border border-white/15 bg-[#171717] p-1 shadow-sm">
        <VectorlessLogo className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1 space-y-2.5">
        {content ? (
          <div dir="auto" className={MARKDOWN_CLASS}>
            <Markdown text={content} />
            {isStreaming ? <StreamingCaret /> : null}
          </div>
        ) : status === 'pending' ? (
          <div className="py-1">
            <StreamingLabel
              label={(() => {
                const active = steps?.find((s) => s.status === 'active')
                return active ? stepLabel(active) : 'Generating answer'
              })()}
            />
          </div>
        ) : null}

        {status === 'error' && !content ? (
          <ErrorState
            title="Unable to complete analysis"
            detail={error}
            onRetry={canRetry ? () => onRetry(id) : undefined}
          />
        ) : null}
        {status === 'error' && content ? (
          <ErrorState
            title="Response interrupted"
            detail={error}
            onRetry={canRetry ? () => onRetry(id) : undefined}
          />
        ) : null}
        {status === 'stopped' ? (
          <ErrorState
            tone="neutral"
            title={content ? 'Response stopped' : 'Generation stopped'}
            onRetry={canRetry ? () => onRetry(id) : undefined}
            retryLabel="Regenerate"
          />
        ) : null}

        {sources.length ? <SourceList sources={sources} /> : null}

        {!hasHistoryOnly ? (
          <AgentActivity
            steps={steps}
            status={status}
            details={{ ...details, duration, sources: sources.length || undefined }}
          />
        ) : null}

        {!isWorking && content ? (
          <div className="flex items-center gap-1 pt-0.5 text-zinc-500">
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Copied' : 'Copy response'}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition hover:bg-white/10 hover:text-zinc-200"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {canRetry && status === 'completed' ? (
              <button
                type="button"
                onClick={() => onRetry(id)}
                aria-label="Regenerate response"
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition hover:bg-white/10 hover:text-zinc-200"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                Regenerate
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
})

export const MessageBubble = memo(function MessageBubble({ message, isLast, busy, onRetry }) {
  if (message.role === 'user') {
    return <UserMessage content={message.content} file={message.file} />
  }
  return <AssistantMessage message={message} isLast={isLast} busy={busy} onRetry={onRetry} />
})
