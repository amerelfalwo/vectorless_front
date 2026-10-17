import { memo, useState } from 'react'
import { BookOpen, Globe, ExternalLink, FileText } from 'lucide-react'

/**
 * @param {{
 *   sources: Array<{ type?: 'pdf' | 'web', title: string, page?: string | null, url?: string, domain?: string }>,
 *   onSelectSource?: (source: { title: string, page: string | null }) => void,
 * }} props
 */
export const SourceList = memo(function SourceList({ sources = [], onSelectSource }) {
  const [expandedIndex, setExpandedIndex] = useState(null)

  if (!sources || sources.length === 0) return null

  const pdfSources = sources.filter((s) => s.type !== 'web' && !s.url)
  const webSources = sources.filter((s) => s.type === 'web' || s.url)

  return (
    <div className="flex flex-col gap-2 pt-1" aria-label="Attributed sources">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#777D76]">
          {webSources.length > 0 && pdfSources.length === 0 ? (
            <>
              <Globe className="h-3 w-3 text-[#0284C7]" aria-hidden />
              المصادر والروابط ({sources.length})
            </>
          ) : (
            <>
              <BookOpen className="h-3 w-3 text-[#285943]" aria-hidden />
              المصادر ({sources.length})
            </>
          )}
        </span>

        {sources.map((s, idx) => {
          const isSelected = expandedIndex === idx
          const isWeb = s.type === 'web' || Boolean(s.url)

          return (
            <button
              type="button"
              key={`${s.type || 'src'}-${s.title}-${s.url || s.page}-${idx}`}
              onClick={() => {
                if (isWeb && s.url) {
                  window.open(s.url, '_blank', 'noopener,noreferrer')
                } else {
                  setExpandedIndex(isSelected ? null : idx)
                  onSelectSource?.(s)
                }
              }}
              title={
                isWeb
                  ? `رابط ويب: ${s.title} · ${s.url}`
                  : s.page
                  ? `قسم في المستند: ${s.title} · صفحة ${s.page}`
                  : `قسم: ${s.title}`
              }
              className={`inline-flex max-w-[280px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition active:scale-[0.98] ${
                isWeb
                  ? 'border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1] hover:border-[#0284C7] hover:bg-[#E0F2FE]'
                  : isSelected
                  ? 'border-[#285943] bg-[#E8F0E8] text-[#285943] font-medium'
                  : 'border-[#E4E5DE] bg-[#FFFFFF] text-[#262B27] hover:border-[#8DAA91] hover:bg-[#F7F6F1]'
              }`}
            >
              {isWeb ? (
                <Globe className="h-3 w-3 shrink-0 text-[#0284C7]" aria-hidden />
              ) : (
                <FileText className="h-3 w-3 shrink-0 text-[#285943]" aria-hidden />
              )}
              <span className="truncate">{s.title}</span>

              {isWeb && s.domain ? (
                <span className="shrink-0 font-mono text-[10px] text-[#0284C7]/80">
                  {s.domain}
                </span>
              ) : s.page ? (
                <span className="shrink-0 font-mono text-[11px] text-[#777D76]">
                  ص {s.page}
                </span>
              ) : null}

              <ExternalLink
                className={`h-3 w-3 shrink-0 ${isWeb ? 'text-[#0284C7]' : 'text-[#8DAA91]'}`}
                aria-hidden
              />
            </button>
          )
        })}
      </div>

      {expandedIndex !== null && sources[expandedIndex] && !sources[expandedIndex].url ? (
        <div className="mt-1 rounded-lg border border-[#E4E5DE] bg-[#F7F6F1] p-3 text-xs text-[#262B27] animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#285943]">
              القسم: {sources[expandedIndex].title}
            </span>
            {sources[expandedIndex].page ? (
              <span className="font-mono text-[11px] text-[#777D76]">
                صفحة {sources[expandedIndex].page}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-[#777D76]">
            معلومة موثقة ومسترجعة بدقة من شجرة فهرس المستند المرفق (PDF).
          </p>
        </div>
      ) : null}
    </div>
  )
})

