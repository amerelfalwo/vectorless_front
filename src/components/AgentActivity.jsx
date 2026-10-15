import { memo, useId, useState } from 'react'
import { Check, ChevronDown, CircleAlert, Square, GitBranch } from 'lucide-react'

import { formatDuration, stepDuration, stepLabel } from '../lib/activity.js'

/** @param {{ step: import('../lib/activity.js').ActivityStep, isLast: boolean }} props */
function ActivityStepItem({ step, isLast }) {
  const { status, reason } = step
  const duration = stepDuration(step)

  let icon
  if (status === 'completed') {
    icon = (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#E8F0E8] text-[#285943]">
        <Check className="h-2.5 w-2.5 stroke-[3]" aria-hidden />
      </span>
    )
  } else if (status === 'active') {
    icon = (
      <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden>
        <span className="absolute h-3 w-3 animate-ping rounded-full bg-[#8DAA91]/30" />
        <span className="relative h-2 w-2 rounded-full bg-[#285943]" />
      </span>
    )
  } else if (status === 'error' && reason === 'stopped') {
    icon = (
      <span className="flex h-4 w-4 items-center justify-center text-[#777D76]">
        <Square className="h-2.5 w-2.5 fill-current" aria-hidden />
      </span>
    )
  } else if (status === 'error') {
    icon = (
      <span className="flex h-4 w-4 items-center justify-center text-red-600">
        <CircleAlert className="h-3.5 w-3.5" aria-hidden />
      </span>
    )
  } else {
    icon = (
      <span className="flex h-4 w-4 items-center justify-center" aria-hidden>
        <span className="h-2 w-2 rounded-full border border-[#D0D2C7] bg-white" />
      </span>
    )
  }

  const label =
    reason === 'stopped'
      ? `${stepLabel({ ...step, status: 'active' })} · Stopped`
      : stepLabel(step)

  const textClass =
    status === 'completed'
      ? 'text-[#262B27]'
      : status === 'active'
        ? 'text-[#285943] font-medium'
        : status === 'error'
          ? reason === 'stopped'
            ? 'text-[#777D76]'
            : 'text-red-700'
          : 'text-[#777D76]'

  return (
    <li className="relative flex gap-3 pb-3 last:pb-0">
      {!isLast ? (
        <span
          className="absolute left-[7.5px] top-4.5 bottom-0 w-px bg-[#E4E5DE]"
          aria-hidden
        />
      ) : null}
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className={`flex items-baseline justify-between gap-2 text-xs leading-5 ${textClass}`}>
          <span>{label}</span>
          {duration ? (
            <span className="font-mono text-[11px] text-[#777D76]">{duration}</span>
          ) : null}
          <span className="sr-only">
            {status === 'completed' ? 'completed' : status === 'active' ? 'in progress' : status}
          </span>
        </div>
        {step.message && status !== 'completed' ? (
          <p className="truncate text-[11px] leading-4 text-[#777D76]">{step.message}</p>
        ) : null}
      </div>
    </li>
  )
}

/**
 * @param {{
 *   steps: import('../lib/activity.js').ActivityStep[],
 *   status: 'pending' | 'streaming' | 'completed' | 'stopped' | 'error',
 *   details?: { filename?: string, sections?: number, duration?: number | null, sources?: number, nodes?: number },
 * }} props
 */
export const AgentActivity = memo(function AgentActivity({ steps = [], status, details }) {
  const panelId = useId()
  const isActive = status === 'pending' || status === 'streaming'
  const [userOpen, setUserOpen] = useState(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const open = userOpen ?? isActive

  const current = steps.find((s) => s.status === 'active')
  let summary = ''
  if (current) summary = current.message ? current.message : stepLabel(current)
  if (!current) {
    if (status === 'completed') summary = 'Retrieval & generation complete'
    else if (status === 'stopped') summary = 'Generation stopped'
    else if (status === 'error') summary = 'Stopped with error'
  }

  const rows = []
  if (details?.filename) rows.push(['Document', details.filename])
  if (details?.nodes != null) rows.push(['Tree nodes inspected', String(details.nodes)])
  if (details?.sections != null) rows.push(['Sections selected', String(details.sections)])
  if (details?.duration != null && !isActive) rows.push(['Evidence response time', formatDuration(details.duration)])
  if (details?.sources != null) rows.push(['Cited sources', String(details.sources)])

  return (
    <section
      aria-label="Document retrieval transparency"
      className="rounded-xl border border-[#E4E5DE] bg-[#FFFFFF] shadow-2xs transition"
    >
      <button
        type="button"
        onClick={() => setUserOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-left text-xs transition hover:bg-[#F7F6F1]"
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#E8F0E8] text-[#285943]">
          <GitBranch className="h-3 w-3" aria-hidden />
        </div>
        <span className="font-medium text-[#262B27]">Research Activity</span>
        {!open && summary ? (
          <span className="min-w-0 flex-1 truncate text-[#777D76]">· {summary}</span>
        ) : (
          <span className="flex-1" />
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-[#777D76] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <div id={panelId} className="border-t border-[#E4E5DE] px-3.5 py-3">
          <ol className="m-0 list-none p-0" aria-label="Processing stages">
            {steps.map((s, i) => (
              <ActivityStepItem key={s.id} step={s} isLast={i === steps.length - 1} />
            ))}
          </ol>

          {rows.length ? (
            <div className="mt-3 border-t border-[#E4E5DE] pt-2">
              <button
                type="button"
                onClick={() => setDetailsOpen((v) => !v)}
                aria-expanded={detailsOpen}
                className="flex items-center gap-1 text-[11px] font-medium text-[#777D76] transition hover:text-[#262B27]"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
                Retrieval telemetry & metadata
              </button>
              {detailsOpen ? (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                  {rows.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-[#777D76]">{k}</dt>
                      <dd className="truncate font-mono text-[11px] text-[#262B27]">{v}</dd>
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
