import { memo } from 'react'
import { BookOpen } from 'lucide-react'

/** @param {{ sources: { title: string, page: string | null }[] }} props */
export const SourceList = memo(function SourceList({ sources }) {
  if (!sources.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1" aria-label="Sources">
      <span className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        <BookOpen className="h-3 w-3" aria-hidden />
        Sources
      </span>
      {sources.map((s) => (
        <span
          key={`${s.title}-${s.page}`}
          title={s.page ? `${s.title} · p.${s.page}` : s.title}
          className="inline-flex max-w-[260px] items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-400"
        >
          <span className="truncate">{s.title}</span>
          {s.page ? <span className="shrink-0 text-zinc-500">· p.{s.page}</span> : null}
        </span>
      ))}
    </div>
  )
})
