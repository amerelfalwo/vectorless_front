/** Inline blinking caret shown right after streamed text in forest green. */
export function StreamingCaret() {
  return (
    <span
      aria-hidden
      className="atlas-caret ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[2px] rounded-sm bg-[#285943]"
    />
  )
}

/** Refined "Generating answer" indicator with animated pulse dots. */
export function StreamingLabel({ label = 'Generating answer' }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#E4E5DE] bg-white px-3 py-1 text-xs text-[#777D76] shadow-xs">
      <span className="flex items-center gap-1" aria-hidden>
        {[0, 180, 360].map((d) => (
          <span
            key={d}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8DAA91]"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </span>
      <span className="font-medium text-[#262B27]">{label}</span>
    </span>
  )
}
