import { memo, useState } from 'react'
import { BookOpen, ExternalLink } from 'lucide-react'


/**
 * @param {{
 *   sources: { title: string, page: string | null }[],
 *   onSelectSource?: (source: { title: string, page: string | null }) => void,
 * }} props
 */
export const SourceList = memo(function SourceList({ sources = [], onSelectSource }) {
  const [expandedIndex, setExpandedIndex] = useState(null)

  if (!sources || sources.length === 0) return null

  return (
    <div className="flex flex-col gap-2 pt-1" aria-label="Attributed sources">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#777D76]">
          <BookOpen className="h-3 w-3 text-[#285943]" aria-hidden />
          Sources ({sources.length})
        </span>

        {sources.map((s, idx) => {
          const isSelected = expandedIndex === idx

          return (
            <button
              type="button"
              key={`${s.title}-${s.page}-${idx}`}
              onClick={() => {
                setExpandedIndex(isSelected ? null : idx)
                onSelectSource?.(s)
              }}
              title={s.page ? `Section: ${s.title} · Page ${s.page}` : `Section: ${s.title}`}
              className={`inline-flex max-w-[280px] items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition active:scale-[0.98] ${
                isSelected
                  ? 'border-[#285943] bg-[#E8F0E8] text-[#285943] font-medium'
                  : 'border-[#E4E5DE] bg-[#FFFFFF] text-[#262B27] hover:border-[#8DAA91] hover:bg-[#F7F6F1]'
              }`}
            >
              <span className="truncate">{s.title}</span>
              {s.page ? (
                <span className="shrink-0 font-mono text-[11px] text-[#777D76]">
                  p. {s.page}
                </span>
              ) : null}
              {onSelectSource ? (
                <ExternalLink className="h-3 w-3 shrink-0 text-[#8DAA91]" aria-hidden />
              ) : null}
            </button>
          )
        })}
      </div>

      {expandedIndex !== null && sources[expandedIndex] ? (
        <div className="mt-1 rounded-lg border border-[#E4E5DE] bg-[#F7F6F1] p-3 text-xs text-[#262B27] animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#285943]">
              Section: {sources[expandedIndex].title}
            </span>
            {sources[expandedIndex].page ? (
              <span className="font-mono text-[11px] text-[#777D76]">
                Page {sources[expandedIndex].page}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-[#777D76]">
            Document evidence grounded in hierarchical tree retrieval. Click on any section in the Document Structure Explorer to inspect full passages.
          </p>
        </div>
      ) : null}
    </div>
  )
})
