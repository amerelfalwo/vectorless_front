import { useRef, useState, useEffect } from 'react'
import {
  ArrowUp,
  Square,
  Sparkles,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
} from 'lucide-react'

import { DocumentCard } from './DocumentCard.jsx'

/**
 * @param {{
 *   value: string
 *   onChange: (value: string) => void
 *   onSend: (opts?: { deepAnalysis?: boolean }) => void
 *   onStop?: () => void
 *   attachedFile?: File | null
 *   onSelectFile?: (file: File) => void
 *   onRemoveFile?: () => void
 *   isUploading?: boolean
 *   fileStatus?: 'staged' | 'uploading' | 'indexing' | 'ready' | 'error'
 *   hasDoc?: boolean
 *   disabled?: boolean
 *   isStreaming: boolean
 *   isCentered?: boolean
 * }} props
 */
export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  attachedFile = null,
  onSelectFile,
  onRemoveFile,
  isUploading = false,
  fileStatus = 'staged',
  hasDoc = false,
  disabled = false,
  isStreaming = false,
  isCentered = false,
}) {
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)
  const [isListening, setIsListening] = useState(false)
  const [deepAnalysis, setDeepAnalysis] = useState(false)

  const inputLocked = disabled || isStreaming || isUploading
  const hasTextOrFile = value.trim().length > 0 || Boolean(attachedFile)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 180)}px`
    }
  }, [value])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file && onSelectFile) {
      onSelectFile(file)
    }
    e.target.value = ''
  }

  // Voice dictation using Web Speech API
  const toggleSpeech = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.')
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onChange(value ? `${value} ${transcript}` : transcript)
    }

    recognition.start()
  }

  return (
    <div
      className={
        isCentered
          ? 'w-full max-w-2xl px-4'
          : 'w-full px-4 pt-1 pb-4 md:px-8'
      }
    >
      <div className={isCentered ? 'w-full' : 'mx-auto max-w-3xl'}>
        {/* Hidden PDF file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={inputLocked}
        />

        {/* Clean, Light Editorial Composer Box */}
        <div className="relative rounded-2xl border border-[#E4E5DE] bg-white shadow-sm transition-all duration-200 focus-within:border-[#285943] focus-within:ring-1 focus-within:ring-[#285943]/20">
          {/* Staged / Uploading attachment preview */}
          {attachedFile ? (
            <div className="border-b border-[#E4E5DE] px-3.5 pt-3 pb-2.5 bg-[#FDFBF7] rounded-t-2xl">
              <DocumentCard
                name={attachedFile.name}
                size={attachedFile.size}
                status={fileStatus}
                onRemove={onRemoveFile}
                disabled={inputLocked}
              />
            </div>
          ) : null}

          {/* Multiline Question Textarea */}
          <div className="px-3.5 pt-3 pb-1">
            <textarea
              ref={textareaRef}
              rows={1}
              dir="auto"
              aria-label="Ask a question about the document"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  if (!inputLocked && hasTextOrFile) onSend(value, { deepAnalysis })
                }
              }}
              disabled={inputLocked}
              placeholder={
                isUploading
                  ? 'Processing document index…'
                  : isStreaming
                    ? 'Generating research response…'
                    : attachedFile
                      ? 'Ask a question about this document…'
                      : hasDoc
                        ? 'Ask a question about the active document…'
                        : 'Ask a question or upload a document to begin…'
              }
              className="max-h-44 min-h-[36px] w-full resize-none bg-transparent py-1 text-sm leading-relaxed text-[#262B27] placeholder:text-[#777D76] focus:outline-none disabled:opacity-50"
            />
          </div>

          {/* Bottom Toolbar Controls */}
          <div className="flex items-center justify-between border-t border-[#F0F1EA] px-3 py-2 bg-white rounded-b-2xl">
            {/* Left Tools: Attach PDF & Deep Analysis toggle */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={inputLocked}
                title="Attach PDF document"
                aria-label="Attach PDF document"
                className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-[#777D76] transition hover:bg-[#F7F6F1] hover:text-[#262B27] disabled:opacity-40"
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#285943]" aria-hidden />
                ) : (
                  <Paperclip className="h-3.5 w-3.5" aria-hidden />
                )}
                <span className="hidden sm:inline">Attach PDF</span>
              </button>

              {/* Deep Analysis Option */}
              <button
                type="button"
                onClick={() => setDeepAnalysis(!deepAnalysis)}
                aria-pressed={deepAnalysis}
                title={deepAnalysis ? 'Deep analysis enabled' : 'Deep analysis disabled'}
                className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition ${
                  deepAnalysis
                    ? 'bg-[#E8F0E8] text-[#285943]'
                    : 'text-[#777D76] hover:bg-[#F7F6F1] hover:text-[#262B27]'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-[#285943]" aria-hidden />
                <span>Deep Analysis</span>
              </button>
            </div>

            {/* Right Tools: Dictation & Send/Stop action */}
            <div className="flex items-center gap-1.5">
              {/* Voice Dictation */}
              <button
                type="button"
                onClick={toggleSpeech}
                aria-label={isListening ? 'Stop voice dictation' : 'Start voice dictation'}
                aria-pressed={isListening}
                title={isListening ? 'Listening… click to finish' : 'Voice dictation'}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  isListening
                    ? 'bg-red-50 text-red-600 animate-pulse'
                    : 'text-[#777D76] hover:bg-[#F7F6F1] hover:text-[#262B27]'
                }`}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Mic className="h-4 w-4" aria-hidden />
                )}
              </button>

              {/* Action Button: Stop if streaming, or Send */}
              {isStreaming && onStop ? (
                <button
                  type="button"
                  onClick={onStop}
                  aria-label="Stop response generation"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-[#E4E5DE] bg-white px-3 text-xs font-medium text-[#262B27] transition hover:bg-[#F7F6F1]"
                >
                  <Square className="h-3 w-3 fill-current text-[#777D76]" aria-hidden />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSend(value, { deepAnalysis })}
                  disabled={inputLocked || !hasTextOrFile}
                  title="Send question"
                  aria-label="Send question"
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition active:scale-95 ${
                    hasTextOrFile && !inputLocked
                      ? 'bg-[#285943] text-white hover:bg-[#1e4533] shadow-xs'
                      : 'bg-[#F7F6F1] text-[#D0D2C7] cursor-not-allowed'
                  }`}
                >
                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quiet disclaimer */}
        {!isCentered && (
          <p className="mt-2 text-center text-[11px] text-[#777D76]">
            Atlas uses deterministic tree retrieval. Citations and passages reflect verified document evidence.
          </p>
        )}
      </div>
    </div>
  )
}
