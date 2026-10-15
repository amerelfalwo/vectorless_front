import { Check, Copy } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { toast } from 'sonner'

/**
 * @param {{ language: string, codeString: string }} props
 */
export function CodeBlock({ language, codeString }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codeString)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }, [codeString])

  const lang = language && language !== 'plaintext' ? language : 'text'

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-[#E4E5DE] bg-[#FFFFFF] shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-[#E4E5DE] bg-[#F7F6F1] px-3 py-1.5">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-[#777D76]">
          {lang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[#777D76] transition hover:bg-white hover:text-[#262B27]"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#285943]" aria-hidden />
              <span className="text-[#285943]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang}
        style={oneLight}
        customStyle={{
          margin: 0,
          padding: '1rem 1.25rem',
          borderRadius: 0,
          background: '#FFFFFF',
          fontSize: '13px',
          lineHeight: 1.55,
        }}
        codeTagProps={{
          className: 'font-mono',
        }}
        showLineNumbers={codeString.split('\n').length > 3}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  )
}
