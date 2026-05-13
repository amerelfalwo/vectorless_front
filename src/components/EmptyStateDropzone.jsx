import { FileText, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

const UPLOAD_STATUS_MESSAGES = [
  'Securing connection...',
  'Uploading document securely...',
  'Extracting text and metadata...',
  'Building the smart hierarchical tree...',
  'Creating logical nodes...',
  'Finalizing document indexing...',
  'Almost ready, just a moment...',
]

const MESSAGE_INTERVAL_MS = 2500
const PROGRESS_CAP = 95
const PROGRESS_DURATION_MS = 12_000

/**
 * Fades between status lines when the index changes.
 * @param {{ messageIndex: number }} props
 */
function CyclingStatusMessage({ messageIndex }) {
  const [visible, setVisible] = useState(true)
  const [displayIndex, setDisplayIndex] = useState(messageIndex)
  const prevRef = useRef(messageIndex)

  useEffect(() => {
    if (messageIndex === prevRef.current) return
    prevRef.current = messageIndex
    setVisible(false)
    const swap = window.setTimeout(() => {
      setDisplayIndex(messageIndex)
      setVisible(true)
    }, 200)
    return () => window.clearTimeout(swap)
  }, [messageIndex])

  return (
    <h2
      className={[
        'min-h-[3.5rem] text-lg font-semibold text-zinc-100 transition-opacity duration-300 ease-out',
        visible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      {UPLOAD_STATUS_MESSAGES[displayIndex]}
    </h2>
  )
}

/**
 * @param {{
 *   disabled?: boolean
 *   isUploading: boolean
 *   documentUploaded?: boolean
 *   uploadSessionId: number
 *   onFileSelected: (file: File) => void
 * }} props
 */
export function EmptyStateDropzone({
  disabled = false,
  isUploading,
  documentUploaded = false,
  uploadSessionId,
  onFileSelected,
}) {
  const [dragOver, setDragOver] = useState(false)
  const [statusIndex, setStatusIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef(null)

  const [prevIsUploading, setPrevIsUploading] = useState(isUploading)
  if (isUploading !== prevIsUploading) {
    setPrevIsUploading(isUploading)
    if (!isUploading) {
      setStatusIndex(0)
      setProgress(0)
    }
  }

  const handleFiles = useCallback(
    (files) => {
      const file = files?.[0]
      if (!file) return
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        return
      }
      onFileSelected(file)
    },
    [onFileSelected],
  )

  const openPicker = useCallback(() => {
    if (!disabled && !isUploading) inputRef.current?.click()
  }, [disabled, isUploading])

  useEffect(() => {
    if (!isUploading) return
    const id = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % UPLOAD_STATUS_MESSAGES.length)
    }, MESSAGE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [isUploading, uploadSessionId])

  useEffect(() => {
    if (!isUploading) return

    if (documentUploaded) {
      const rafId = requestAnimationFrame(() => {
        setProgress(100)
      })
      return () => cancelAnimationFrame(rafId)
    }

    const startedAt = performance.now()
    let raf = 0

    const tick = (now) => {
      const elapsed = now - startedAt
      const next = Math.min(PROGRESS_CAP, (elapsed / PROGRESS_DURATION_MS) * PROGRESS_CAP)
      setProgress(next)
      if (next < PROGRESS_CAP) {
        raf = requestAnimationFrame(tick)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isUploading, documentUploaded, uploadSessionId])

  const loadingShell = (
    <div className="animate-pulse rounded-2xl border-2 border-dashed border-zinc-700/90 bg-zinc-900/50 px-8 py-12 text-center ring-1 ring-zinc-800/80">
      <div className="mb-6 flex items-center justify-center gap-4">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 ring-1 ring-zinc-700">
          <FileText className="h-8 w-8 animate-pulse text-violet-400" aria-hidden />
        </div>
        <Loader2 className="h-10 w-10 shrink-0 animate-spin text-indigo-400" aria-hidden />
      </div>

      <div className="mx-auto max-w-md">
        <CyclingStatusMessage key={uploadSessionId} messageIndex={statusIndex} />
        {documentUploaded ? (
          <p className="mt-1 text-sm text-zinc-400 transition-opacity duration-300" aria-live="polite">
            Creating chat session…
          </p>
        ) : null}
      </div>

      <div className="mx-auto mt-8 w-full max-w-md">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={[
              'h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500',
              documentUploaded
                ? 'transition-[width] duration-300 ease-out'
                : 'transition-none',
            ].join(' ')}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs tabular-nums text-zinc-500">
          {Math.round(progress)}% complete
        </p>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
      {isUploading ? (
        <div className="w-full max-w-lg">{loadingShell}</div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openPicker()
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault()
            if (!disabled && !isUploading) setDragOver(true)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled && !isUploading) setDragOver(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setDragOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (disabled || isUploading) return
            handleFiles(e.dataTransfer.files)
          }}
          onClick={openPicker}
          className={[
            'flex w-full max-w-lg cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-8 py-14 text-center transition',
            disabled || isUploading
              ? 'cursor-not-allowed border-zinc-800 bg-zinc-900/40 opacity-60'
              : dragOver
                ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-900/20'
                : 'border-zinc-700 bg-zinc-900/30 hover:border-zinc-500 hover:bg-zinc-900/50',
          ].join(' ')}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={disabled || isUploading}
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 ring-1 ring-zinc-700">
            <FileText className="h-8 w-8 text-violet-400" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">Drop your PDF here</h2>
          <p className="mt-2 max-w-sm text-sm text-zinc-400">
            Or click to browse. After upload, you can ask grounded questions with citations.
          </p>
        </div>
      )}
    </div>
  )
}
