/**
 * Activity timeline model.
 *
 * Steps are driven ONLY by events the frontend can actually observe:
 *  - upload request bytes fully sent         -> upload completed, index active
 *  - upload response received                -> index completed
 *  - /ask request sent                       -> retrieve active
 *  - first streamed token received           -> retrieve completed, generate active
 *  - stream finished                         -> generate completed
 *  - abort / error                           -> active step stopped / errored
 *
 * The backend does not emit stage events yet. When it does, call
 * activateStep / completeStep / failStep from that event handler instead.
 *
 * @typedef {'pending' | 'active' | 'completed' | 'error'} StepStatus
 * @typedef {{
 *   id: string,
 *   status: StepStatus,
 *   message?: string,
 *   reason?: 'stopped',
 *   startedAt?: number,
 *   completedAt?: number,
 * }} ActivityStep
 *
 * @typedef {'idle' | 'uploading' | 'indexing' | 'ready' | 'retrieving'
 *   | 'generating' | 'streaming' | 'completed' | 'error'} AgentStatus
 */

export const STEP = {
  UPLOAD: 'upload',
  INDEX: 'index',
  RETRIEVE: 'retrieve',
  GENERATE: 'generate',
}

const LABELS = {
  upload: {
    pending: 'Upload document',
    active: 'Uploading document',
    completed: 'Document uploaded',
    error: 'Upload failed',
  },
  index: {
    pending: 'Index document',
    active: 'Indexing document',
    completed: 'Document indexed',
    error: 'Indexing failed',
  },
  retrieve: {
    pending: 'Search relevant sections',
    active: 'Searching relevant sections',
    completed: 'Context retrieved',
    error: 'Search failed',
  },
  generate: {
    pending: 'Generate answer',
    active: 'Generating answer',
    completed: 'Answer ready',
    error: 'Generation interrupted',
  },
}

/** Live status text used by the (visually hidden) aria-live region. */
export const AGENT_STATUS_TEXT = {
  idle: '',
  uploading: 'Uploading document',
  indexing: 'Indexing document',
  ready: 'Document ready',
  retrieving: 'Searching document',
  generating: 'Generating answer',
  streaming: 'Generating answer',
  completed: 'Answer ready',
  error: 'Unable to complete analysis',
}

/**
 * @param {{ hasFile: boolean, hasDoc: boolean }} opts
 * @returns {ActivityStep[]}
 */
export function createSteps({ hasFile, hasDoc }) {
  const ids = []
  if (hasFile) ids.push(STEP.UPLOAD, STEP.INDEX)
  if (hasFile || hasDoc) ids.push(STEP.RETRIEVE, STEP.GENERATE)
  return ids.map((id) => ({ id, status: 'pending' }))
}

/** @param {ActivityStep} step */
export function stepLabel(step) {
  return LABELS[step.id]?.[step.status] ?? step.id
}

function patch(steps, id, fn) {
  return steps.map((s) => (s.id === id ? fn(s) : s))
}

/** @returns {ActivityStep[]} */
export function activateStep(steps, id, message) {
  return patch(steps, id, (s) =>
    s.status === 'completed'
      ? s
      : { ...s, status: 'active', message, startedAt: s.startedAt ?? Date.now() },
  )
}

/**
 * @param {ActivityStep[]} steps
 * @param {string} id
 * @param {number} [overrideDurationMs]
 * @returns {ActivityStep[]}
 */
export function completeStep(steps, id, overrideDurationMs) {
  return patch(steps, id, (s) =>
    s.status === 'completed'
      ? s
      : {
          ...s,
          status: 'completed',
          message: undefined,
          startedAt:
            overrideDurationMs != null
              ? Date.now() - overrideDurationMs
              : (s.startedAt ?? Date.now()),
          completedAt: Date.now(),
        },
  )
}

/** @returns {ActivityStep[]} */
export function failStep(steps, id, message) {
  return patch(steps, id, (s) => ({
    ...s,
    status: 'error',
    message,
    completedAt: Date.now(),
  }))
}

/** Fail every currently-active step (used for errors / user stop). */
export function failActive(steps, message, reason) {
  return steps.map((s) =>
    s.status === 'active'
      ? { ...s, status: 'error', message, reason, completedAt: Date.now() }
      : s,
  )
}

export function formatDuration(ms) {
  if (ms == null || Number.isNaN(ms) || ms < 0) return ''
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

export function stepDuration(step) {
  if (step.status !== 'completed' || !step.startedAt || !step.completedAt) return ''
  const ms = step.completedAt - step.startedAt
  if (ms < 50) return ''
  return formatDuration(ms)
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
