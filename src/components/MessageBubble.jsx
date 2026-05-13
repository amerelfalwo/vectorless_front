import { lazy, Suspense } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const CodeBlock = lazy(() =>
  import('./CodeBlock.jsx').then((m) => ({ default: m.CodeBlock })),
)

/**
 * @param {{ role: 'user' | 'assistant', content: string }} props
 */
export function MessageBubble({ role, content }) {
  const isUser = role === 'user'

  return (
    <div
      className={[
        'flex w-full',
        isUser ? 'justify-end' : 'justify-start',
      ].join(' ')}
    >
      <div
        className={[
          'max-w-[min(85%,42rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ring-1',
          isUser
            ? 'bg-violet-600/90 text-white ring-violet-500/30'
            : 'bg-zinc-900/80 text-zinc-100 ring-zinc-700/80',
        ].join(' ')}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div
            className={[
              'markdown-body max-w-none space-y-3 text-sm leading-relaxed',
              '[&_p]:my-2 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-lg [&_h1]:font-semibold',
              '[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-base [&_h2]:font-semibold',
              '[&_h3]:mt-2 [&_h3]:text-sm [&_h3]:font-semibold',
              '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
              '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
              '[&_li]:my-0.5',
              '[&_blockquote]:border-l-2 [&_blockquote]:border-zinc-600 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-300',
              '[&_a]:text-violet-300 [&_a]:underline',
              '[&_code]:rounded [&_code]:bg-zinc-950 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-violet-200',
              '[&_th]:border [&_th]:border-zinc-600 [&_th]:bg-zinc-950 [&_th]:px-3 [&_th]:py-2 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-zinc-200',
              '[&_td]:border [&_td]:border-zinc-700 [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs [&_td]:text-zinc-300',
              '[&_thead]:bg-zinc-900/80',
            ].join(' ')}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ ...props }) => (
                  <a target="_blank" rel="noopener noreferrer" {...props} />
                ),
                table: ({ children }) => (
                  <div className="my-3 overflow-x-auto rounded-lg border border-zinc-700/90 bg-zinc-950/40 ring-1 ring-zinc-800/80">
                    <table className="w-full min-w-[280px] border-collapse text-left text-xs">
                      {children}
                    </table>
                  </div>
                ),
                code: ({ className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '')
                  const codeText = String(children).replace(/\n$/, '')
                  const isBlock = Boolean(match)

                  if (isBlock && match) {
                    return (
                      <Suspense
                        fallback={
                          <div
                            className="my-3 h-28 animate-pulse rounded-lg bg-zinc-950 ring-1 ring-zinc-800"
                            aria-hidden
                          />
                        }
                      >
                        <CodeBlock language={match[1]} codeString={codeText} />
                      </Suspense>
                    )
                  }

                  return (
                    <code
                      className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-[13px] text-violet-200"
                      {...props}
                    >
                      {children}
                    </code>
                  )
                },
                pre: ({ children }) => <>{children}</>,
              }}
            >
              {content || '\u00a0'}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
