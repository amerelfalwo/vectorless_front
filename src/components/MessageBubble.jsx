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
import { AtlasLogo } from './AtlasLogo.jsx'
import { PRODUCT_CONFIG } from '../config/product.js'

const CodeBlock = lazy(() =>
  import('./CodeBlock.jsx').then((m) => ({ default: m.CodeBlock })),
)

const REMARK_PLUGINS = [remarkGfm]

const MD_COMPONENTS = {
  // eslint-disable-next-line no-unused-vars
  a: ({ node: _node, ...props }) => (
    <a target="_blank" rel="noopener noreferrer" className="text-[#285943] underline underline-offset-2 hover:text-[#1e4533]" {...props} />
  ),
  // eslint-disable-next-line no-unused-vars
  img: ({ node: _node, src, alt, ...props }) => {
    const imgSrc = src?.startsWith('/static/') ? `${API_BASE_URL}${src}` : src
    return (
      <figure className="my-4 overflow-hidden rounded-xl border border-[#E4E5DE] bg-white p-2 shadow-xs">
        <img
          src={imgSrc}
          alt={alt}
          loading="lazy"
          className="h-auto max-w-full rounded-lg"
          {...props}
        />
        {alt ? (
          <figcaption className="mt-2 text-center text-xs text-[#777D76]">
            {alt}
          </figcaption>
        ) : null}
      </figure>
    )
  },
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-[#E4E5DE] bg-white shadow-2xs">
      <table className="w-full min-w-[320px] border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  // eslint-disable-next-line no-unused-vars
  code: ({ node: _node, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '')
    const codeText = String(children).replace(/\n$/, '')
    if (match) {
      return (
        <Suspense fallback={<div className="my-3 h-24 animate-pulse rounded-lg bg-[#ECEEE7]" />}>
          <CodeBlock language={match[1]} codeString={codeText} />
        </Suspense>
      )
    }
    return (
      <code
        className="rounded bg-[#ECEEE7] px-1.5 py-0.5 font-mono text-xs text-[#285943]"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }) => <>{children}</>,
}

/** Markdown body, re-rendered only when text updates */
const Markdown = memo(function Markdown({ text }) {
  return (
    <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={MD_COMPONENTS}>
      {text}
    </ReactMarkdown>
  )
})

/** User Question Message */
const UserMessage = memo(function UserMessage({ content, file }) {
  return (
    <div className="flex w-full flex-col items-end gap-2 py-3">
      {file ? (
        <DocumentCard
          name={file.name}
          size={file.size}
          status={file.status ?? 'ready'}
          compact={false}
        />
      ) : null}

      {content ? (
        <div
          dir="auto"
          className="max-w-[85%] rounded-2xl border border-[#E4E5DE] bg-[#FFFFFF] px-4 py-3 text-sm leading-relaxed text-[#262B27] shadow-2xs md:max-w-[75%]"
        >
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </div>
      ) : null}
    </div>
  )
})

/** Assistant Research Response Message */
const AssistantMessage = memo(function AssistantMessage({
  message,
  isLast,
  busy,
  onRetry,
  onSelectCitation,
}) {
  const [copied, setCopied] = useState(false)
  const {
    id,
    content = '',
    status = 'completed',
    steps,
    error,
    startedAt,
    completedAt,
    details,
  } = message

  const isWorking = status === 'pending' || status === 'streaming'
  const isStreaming = status === 'streaming'
  const sources = useMemo(
    () => (isWorking ? [] : extractSources(content)),
    [content, isWorking],
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  const duration = completedAt && startedAt ? completedAt - startedAt : null
  const canRetry = Boolean(onRetry) && isLast && !busy && !isWorking
  const hasHistoryOnly = !steps?.length

  return (
    <article
      className="flex w-full gap-3 py-4 text-sm leading-relaxed text-[#262B27]"
      aria-label={`${PRODUCT_CONFIG.agentName || PRODUCT_CONFIG.name} response`}
    >
      {/* Brand Icon Marker */}
      <AtlasLogo className="mt-0.5 h-7 w-7" />

      <div className="min-w-0 flex-1 space-y-2.5">
        {/* Agent Identity Header */}
        <div className="flex items-center gap-2 select-none">
          <span className="text-xs font-semibold tracking-wide text-[#285943]">
            {PRODUCT_CONFIG.agentName || PRODUCT_CONFIG.name}
          </span>
          <span className="text-[11px] font-medium text-[#777D76]">
            {PRODUCT_CONFIG.category}
          </span>
        </div>

        {/* Main Content Body */}
        {content ? (
          <div dir="auto" className="markdown-body">
            <Markdown text={content} />
            {isStreaming ? <StreamingCaret /> : null}
          </div>
        ) : status === 'pending' ? (
          <div className="py-1">
            <StreamingLabel
              label={(() => {
                const active = steps?.find((s) => s.status === 'active')
                return active ? stepLabel(active) : 'Analyzing document hierarchy'
              })()}
            />
          </div>
        ) : null}

        {/* Error States */}
        {status === 'error' && !content ? (
          <ErrorState
            title="Unable to complete document analysis"
            detail={error}
            onRetry={canRetry ? () => onRetry(id) : undefined}
          />
        ) : null}

        {status === 'error' && content ? (
          <ErrorState
            title="Analysis interrupted"
            detail={error}
            onRetry={canRetry ? () => onRetry(id) : undefined}
          />
        ) : null}

        {status === 'stopped' ? (
          <ErrorState
            tone="neutral"
            title={content ? 'Response generation stopped' : 'Generation stopped'}
            onRetry={canRetry ? () => onRetry(id) : undefined}
            retryLabel="Regenerate"
          />
        ) : null}

        {/* Citations List */}
        {sources.length > 0 ? (
          <SourceList sources={sources} onSelectSource={onSelectCitation} />
        ) : null}

        {/* Research Activity Accordion */}
        {!hasHistoryOnly ? (
          <AgentActivity
            steps={steps}
            status={status}
            details={{
              ...details,
              duration,
              sources: sources.length || undefined,
            }}
          />
        ) : null}

        {/* Response Actions Toolbar */}
        {!isWorking && content ? (
          <div className="flex items-center gap-1.5 pt-1 text-[#777D76]">
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Copied' : 'Copy response'}
              className="flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1 text-xs transition hover:border-[#E4E5DE] hover:bg-white hover:text-[#262B27]"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-[#285943]" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {canRetry && status === 'completed' ? (
              <button
                type="button"
                onClick={() => onRetry(id)}
                aria-label="Regenerate response"
                className="flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1 text-xs transition hover:border-[#E4E5DE] hover:bg-white hover:text-[#262B27]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                <span>Regenerate</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
})

export const MessageBubble = memo(function MessageBubble({
  message,
  isLast,
  busy,
  onRetry,
  onSelectCitation,
}) {
  if (message.role === 'user') {
    return <UserMessage content={message.content} file={message.file} />
  }
  return (
    <AssistantMessage
      message={message}
      isLast={isLast}
      busy={busy}
      onRetry={onRetry}
      onSelectCitation={onSelectCitation}
    />
  )
})
