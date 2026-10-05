import { FileText } from 'lucide-react'

const SUGGESTIONS = [
  'Summarize this document',
  'What are the main findings?',
  'Explain the methodology',
  'What are the key contributions?',
]

/** @param {{ onPick: (text: string) => void, docName?: string | null }} props */
export function EmptyState({ onPick, docName }) {
  return (
    <div className="mb-6 flex w-full max-w-[720px] flex-col items-center px-4 text-center">
      <h1 className="text-2xl font-medium tracking-tight text-white md:text-3xl">
        Ask anything about your documents
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
        Upload a PDF to analyze, search, summarize, and explore its contents.
      </p>

      {docName ? (
        <p className="mt-4 inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          <FileText className="h-3.5 w-3.5 shrink-0 text-red-400" aria-hidden />
          <span className="truncate">{docName}</span>
        </p>
      ) : null}

      <ul className="mt-5 flex list-none flex-wrap justify-center gap-2 p-0">
        {SUGGESTIONS.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="rounded-full border border-white/10 px-3.5 py-1.5 text-[13px] text-zinc-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
