import { memo, useId, useState } from 'react'
import { Check, ChevronDown, CircleAlert, Sparkles, Square } from 'lucide-react'
import { formatDuration, stepDuration, stepLabel } from '../lib/activity.js'

/** @param {{ step: import('../lib/activity.js').ActivityStep, isLast: boolean }} props */
function ActivityStep({ step, isLast }) {
  const { status, reason } = step
  const duration = stepDuration(step)

  let icon
  if (status === 'completed') {
    icon = (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
        <Check className="h-2.5 w-2.5 stroke-[3]" aria-hidden />
      </span>
    )
  } else if (status === 'active') {
    icon = (
      <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden>
        <span className="absolute h-3 w-3 animate-ping rounded-full bg-sky-400/30" />
        <span className="relative h-2 w-2 rounded-full bg-sky-400" />
      </span>
    )
  } else if (status === 'error' && reason === 'stopped') {
    icon = (
      <span className="flex h-4 w-4 items-center justify-center text-zinc-400">
        <Square className="h-2.5 w-2.5 fill-current" aria-hidden />
      </span>
    )
  } else if (status === 'error') {
    icon = (
      <span className="flex h-4 w-4 items-center justify-center text-red-400">
        <CircleAlert className="h-3.5 w-3.5" aria-hidden />
      </span>
    )
  } else {
    icon = (
      <span className="flex h-4 w-4 items-center justify-center" aria-hidden>
        <span className="h-2 w-2 rounded-full border border-zinc-600" />
      </span>
    )
  }

  const label = reason === 'stopped' ? `${stepLabel({ ...step, status: 'active' })} · stopped` : stepLabel(step)
  const textClass =
    status === 'completed'
      ? 'text-zinc-300'
      : status === 'active'
        ? 'text-zinc-100'
        : status === 'error'
          ? reason === 'stopped'
            ? 'text-zinc-400'
            : 'text-red-300'
          : 'text-zinc-500'

  return (
    <li className="relative flex gap-2.5 pb-2.5 last:pb-0">
      {!isLast ? (
        <span className="absolute left-[7.5px] top-4 bottom-0 w-px bg-white/10" aria-hidden />
      ) : null}
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className={`flex items-baseline gap-2 text-[13px] leading-5 ${textClass}`}>
          <span>{label}</span>
          {duration ? <span className="text-[11px] text-zinc-500">{duration}</span> : null}
          <span className="sr-only">
            {status === 'completed' ? 'completed' : status === 'active' ? 'in progress' : status}
          </span>
        </div>
        {step.message && status !== 'completed' ? (
          <p className="truncate text-xs leading-4 text-zinc-500">{step.message}</p>
        ) : null}
      </div>
    </li>
  )
}

/**
 * @param {{
 *   steps: import('../lib/activity.js').ActivityStep[],
 *   status: 'pending' | 'streaming' | 'completed' | 'stopped' | 'error',
 *   details?: { filename?: string, sections?: number, duration?: number | null, sources?: number },
 * }} props
 */
export const AgentActivity = memo(function AgentActivity({ steps, status, details }) {
  const panelId = useId()
  const isActive = status === 'pending' || status === 'streaming'
  // null = follow default (open while working, collapsed when finished)
  const [userOpen, setUserOpen] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const open = userOpen ?? isActive

  const current = steps.find((s) => s.status === 'active')
  let summary = ''
  if (current) summary = current.message ? `${current.message}` : ''
  if (!current) {
    if (status === 'completed') summary = 'Completed'
    else if (status === 'stopped') summary = 'Stopped'
    else if (status === 'error') summary = 'Stopped with an error'
  }
  const headline = current ? stepLabel(current) : summary

  const rows = []
  if (details?.filename) rows.push(['Document', details.filename])
  if (details?.sections) rows.push(['Sections indexed', String(details.sections)])
  if (details?.duration != null && !isActive) rows.push(['Response time', formatDuration(details.duration)])
  if (details?.sources) rows.push(['Cited sources', String(details.sources)])

  return (
    <section
      aria-label="Agent activity"
      className="rounded-xl border border-white/10 bg-[#1a1a1a]/70"
    >
      <button
        type="button"
        onClick={() => setUserOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
        <span className="font-medium text-zinc-300">Agent Activity</span>
        {!open && headline ? (
          <span className="min-w-0 flex-1 truncate text-zinc-500">· {headline}</span>
        ) : (
          <span className="flex-1" />
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div id={panelId} className="border-t border-white/5 px-3 py-3">
          <ol className="m-0 list-none p-0" aria-label="Processing steps">
            {steps.map((s, i) => (
              <ActivityStep key={s.id} step={s} isLast={i === steps.length - 1} />
            ))}
          </ol>

          {rows.length ? (
            <div className="mt-3 border-t border-white/5 pt-2">
              <button
                type="button"
                onClick={() => setDetailsOpen((v) => !v)}
                aria-expanded={detailsOpen}
                className="flex items-center gap-1 text-[11px] text-zinc-500 transition hover:text-zinc-300"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
                Analysis details
              </button>
              {detailsOpen ? (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                  {rows.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-zinc-500">{k}</dt>
                      <dd className="truncate text-zinc-300">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
})
