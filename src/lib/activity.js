/**
 * Document Intelligence Activity Pipeline
 *
 * Reflects genuine stages in Vectorless RAG retrieval and answer synthesis:
 *  - Upload document (when a PDF travels with message)
 *  - Indexing hierarchical tree
 *  - Understanding query intent
 *  - Exploring document tree
 *  - Selecting relevant sections
 *  - Retrieving supporting evidence
 *  - Generating final grounded response
 *
 * @typedef {'pending' | 'active' | 'completed' | 'error'} StepStatus
 * @typedef {{
 *   id: string,
 *   status: StepStatus,
 *   message?: string,
 *   reason?: 'stopped',
 *   startedAt?: number,
 *   completedAt?: number,
 *   meta?: Record<string, any>,
 * }} ActivityStep
 *
 * @typedef {'idle' | 'uploading' | 'indexing' | 'ready' | 'retrieving'
 *   | 'generating' | 'streaming' | 'completed' | 'error'} AgentStatus
 */

export const STEP = {
  UPLOAD: 'upload',
  INDEX: 'index',
  UNDERSTAND: 'understand',
  EXPLORE: 'explore',
  SELECT: 'select',
  RETRIEVE: 'retrieve',
  GENERATE: 'generate',
}

const LABELS = {
  upload: {
    pending: 'Upload document',
    active: 'Uploading document bytes',
    completed: 'Document uploaded',
    error: 'Upload failed',
  },
  index: {
    pending: 'Build hierarchical index',
    active: 'Constructing document tree index',
    completed: 'Document index ready',
    error: 'Indexing failed',
  },
  understand: {
    pending: 'Understand question',
    active: 'Analyzing question and information requirements',
    completed: 'Question analyzed',
    error: 'Question understanding failed',
  },
  explore: {
    pending: 'Explore document structure',
    active: 'Navigating section hierarchy and outline',
    completed: 'Document structure traversed',
    error: 'Structure exploration failed',
  },
  select: {
    pending: 'Select relevant sections',
    active: 'Matching query intent against document nodes',
    completed: 'Relevant sections selected',
    error: 'Section selection failed',
  },
  retrieve: {
    pending: 'Retrieve supporting evidence',
    active: 'Extracting grounded section text and passages',
    completed: 'Supporting evidence retrieved',
    error: 'Retrieval failed',
  },
  generate: {
    pending: 'Generate final response',
    active: 'Synthesizing evidence into structured response',
    completed: 'Final response generated',
    error: 'Generation interrupted',
  },
}

/** Screen reader announcements */
export const AGENT_STATUS_TEXT = {
  idle: '',
  uploading: 'Uploading document',
  indexing: 'Indexing document tree',
  ready: 'Document ready for research',
  retrieving: 'Exploring document and retrieving evidence',
  generating: 'Generating response',
  streaming: 'Streaming response',
  completed: 'Response ready',
  error: 'Analysis stopped with an error',
}

/**
 * Creates step timeline based on whether file is being uploaded and whether doc is attached.
 * @param {{ hasFile: boolean, hasDoc: boolean }} opts
 * @returns {ActivityStep[]}
 */
export function createSteps({ hasFile, hasDoc }) {
  const ids = []
  if (hasFile) {
    ids.push(STEP.UPLOAD, STEP.INDEX)
  }
  if (hasFile || hasDoc) {
    ids.push(STEP.UNDERSTAND, STEP.EXPLORE, STEP.SELECT, STEP.RETRIEVE, STEP.GENERATE)
  } else {
    // Pure conversational assistant
    ids.push(STEP.UNDERSTAND, STEP.GENERATE)
  }
  return ids.map((id) => ({ id, status: 'pending' }))
}

/** @param {ActivityStep} step */
export function stepLabel(step) {
  if (step.message && step.status === 'completed') {
    return step.message
  }
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

/** @returns {ActivityStep[]} */
export function updateStep(steps, id, message, meta) {
  return patch(steps, id, (s) => ({
    ...s,
    message: message ?? s.message,
    meta: meta ? { ...(s.meta || {}), ...meta } : s.meta,
  }))
}

/**
 * @param {ActivityStep[]} steps
 * @param {string} id
 * @param {number} [overrideDurationMs]
 * @param {string} [completionMessage]
 * @param {Record<string, any>} [meta]
 * @returns {ActivityStep[]}
 */
export function completeStep(steps, id, overrideDurationMs, completionMessage, meta) {
  return patch(steps, id, (s) =>
    s.status === 'completed'
      ? s
      : {
          ...s,
          status: 'completed',
          message: completionMessage ?? s.message,
          startedAt:
            overrideDurationMs != null
              ? Date.now() - overrideDurationMs
              : (s.startedAt ?? Date.now()),
          completedAt: Date.now(),
          meta: meta ? { ...(s.meta || {}), ...meta } : s.meta,
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

/** Fail every currently-active step */
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
  return `${(ms / 1000).toFixed(2)} s`
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
