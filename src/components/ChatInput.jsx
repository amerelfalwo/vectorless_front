import { useRef, useState, useEffect } from 'react'
import { Plus, ArrowUp, Square, Brain, Loader2, Mic, MicOff } from 'lucide-react'
import { DocumentCard } from './DocumentCard.jsx'

/**
 * @param {{
 *   value: string
 *   onChange: (value: string) => void
 *   onSend: () => void
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
  const [thinkEnabled, setThinkEnabled] = useState(false)

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

  // Voice dictation using Web Speech API if supported
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
    recognition.lang = 'ar-SA' // support Arabic & English

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
          ? 'w-full max-w-[720px] px-4'
          : 'w-full px-4 pt-2 pb-5 md:px-8'
      }
    >
      <div className={isCentered ? 'w-full' : 'mx-auto max-w-3xl'}>
        {/* Hidden File Input for PDF */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={inputLocked}
        />

        {/* ChatGPT Style Floating Capsule Input Container */}
        <div className="relative rounded-[28px] border border-white/10 bg-[#2f2f2f] shadow-xl transition-all duration-200 focus-within:border-white/20">
          {/* Staged / uploading attachment */}
          {attachedFile ? (
            <div className="border-b border-white/5 px-3 pt-3 pb-2.5">
              <DocumentCard
                name={attachedFile.name}
                size={attachedFile.size}
                status={fileStatus}
                onRemove={onRemoveFile}
                disabled={inputLocked}
              />
            </div>
          ) : null}

          {/* Main Input Row */}
          <div className="flex items-center gap-2 px-3 py-2">
            {/* Plus Button for Attaching PDF */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={inputLocked}
              title="Attach PDF Document"
              aria-label="Attach PDF document"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-300" aria-hidden />
              ) : (
                <Plus className="h-5 w-5" aria-hidden />
              )}
            </button>

            {/* Input Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              dir="auto"
              aria-label="Message"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  if (!inputLocked && hasTextOrFile) onSend({ deepAnalysis: thinkEnabled })
                }
              }}
              disabled={inputLocked}
              placeholder={
                isUploading
                  ? 'Preparing document...'
                  : isStreaming
                    ? 'Generating answer...'
                    : attachedFile
                      ? 'Ask anything about this document...'
                      : hasDoc
                        ? 'Ask a follow-up about the document...'
                        : 'Ask anything...'
              }
              className="max-h-40 min-h-[30px] flex-1 resize-none bg-transparent py-1 text-[15px] leading-relaxed text-[#ececec] placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
            />

            {/* Right Controls: Think pill + Mic + Voice Waveform / Send Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Analysis-depth control (UI preference only; not a reasoning display) */}
              <button
                type="button"
                onClick={() => setThinkEnabled(!thinkEnabled)}
                aria-pressed={thinkEnabled}
                title={thinkEnabled ? 'Deep analysis: on' : 'Deep analysis: off'}
                className={`hidden sm:flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                  thinkEnabled
                    ? 'border-white/15 bg-white/5 text-zinc-200 hover:bg-white/10'
                    : 'border-white/5 text-zinc-500 hover:bg-white/5'
                }`}
              >
                <Brain
                  className={`h-3.5 w-3.5 ${thinkEnabled && isStreaming ? 'animate-pulse text-sky-300' : ''}`}
                  aria-hidden
                />
                <span className="text-[12px] font-medium">
                  {thinkEnabled ? (isStreaming ? 'Analyzing...' : 'Deep Analysis') : 'Think'}
                </span>
              </button>

              {/* Dictation Mic Button */}
              <button
                type="button"
                onClick={toggleSpeech}
                aria-label={isListening ? 'Stop voice dictation' : 'Start voice dictation'}
                aria-pressed={isListening}
                title={isListening ? 'Listening... click to stop' : 'Voice dictation'}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                  isListening
                    ? 'bg-red-500/20 text-red-400 animate-pulse'
                    : 'text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Mic className="h-4 w-4" aria-hidden />
                )}
              </button>

              {/* Action Button: Stop if streaming, Send if typed/attached, or Purple Voice Waveform if empty */}
              {isStreaming && onStop ? (
                <button
                  type="button"
                  onClick={onStop}
                  aria-label="Stop generating"
                  title="Stop generating"
                  className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-medium text-black transition hover:bg-zinc-200"
                >
                  <Square className="h-3 w-3 fill-current" aria-hidden />
                  Stop
                </button>
              ) : hasTextOrFile ? (
                <button
                  type="button"
                  onClick={() => onSend({ deepAnalysis: thinkEnabled })}
                  disabled={inputLocked}
                  title="Send message"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:opacity-90 active:scale-95 shadow-md"
                >
                  <ArrowUp className="h-4 w-4 stroke-[2.5]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleSpeech}
                  title="Start voice session"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5244e1] text-white transition hover:bg-[#483bc9] active:scale-95 shadow-sm"
                >
                  {/* Purple Equalizer Audio Waveform Bars */}
                  <div className="flex items-center gap-[2.5px] h-3.5">
                    <span className="w-[2.5px] h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-[2.5px] h-3.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-[2.5px] h-2.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    <span className="w-[2.5px] h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Small bottom footer note when not centered */}
        {!isCentered ? (
          <p className="mt-2 text-center text-[11px] text-zinc-500">
            Vectorless RAG can make mistakes. Check important document details.
          </p>
        ) : null}
      </div>
    </div>
  )
}

