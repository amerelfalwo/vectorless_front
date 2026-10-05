/** Inline blinking caret shown right after streamed text. */
export function StreamingCaret() {
  return (
    <span
      aria-hidden
      className="vl-caret ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] rounded-sm bg-zinc-300/80"
    />
  )
}

/** Small "Generating answer" pill with animated dots. */
export function StreamingLabel({ label = 'Generating answer' }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
      <span className="flex items-center gap-0.5" aria-hidden>
        {[0, 150, 300].map((d) => (
          <span
            key={d}
            className="h-1 w-1 animate-pulse rounded-full bg-zinc-400"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </span>
      {label}
    </span>
  )
}
