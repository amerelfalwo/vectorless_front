import { FileText, ArrowRight } from 'lucide-react'

import { PRODUCT_CONFIG } from '../config/product.js'

const EXAMPLE_PROMPTS = [
  {
    title: 'Summarize main arguments',
    desc: 'Extract key theses, conclusions, and central claims from the material.',
    prompt: 'Summarize the main arguments in this document.',
  },
  {
    title: 'Compare findings & methodology',
    desc: 'Contrast results, empirical data, or procedural frameworks.',
    prompt: 'Compare the findings and methodology presented in this document.',
  },
  {
    title: 'Find supporting evidence',
    desc: 'Locate precise citations, data points, or quotes for a specific thesis.',
    prompt: 'Find evidence supporting the primary claims made in the document.',
  },
  {
    title: 'Explain technical concepts',
    desc: 'Break down complex formulas, taxonomies, or architectures.',
    prompt: 'Explain the core technical concepts using the provided source material.',
  },
]

/**
 * @param {{
 *   onPick: (text: string) => void,
 *   docName?: string | null,
 * }} props
 */
export function EmptyState({ onPick, docName }) {
  return (
    <div className="flex w-full max-w-2xl flex-col items-center px-4 py-8 text-center animate-fadeIn">
      {/* Brand Logo Emblem */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#E4E5DE] bg-white p-2 shadow-xs transition hover:scale-105">
        <img
          src="/atlas_logo_icon.png"
          alt="Atlas Logo"
          className="h-full w-full object-contain"
        />
      </div>

      {/* Active Document Badge or Category Tag */}
      {docName ? (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E4E5DE] bg-white px-3.5 py-1 text-xs text-[#262B27] shadow-xs">
          <FileText className="h-3.5 w-3.5 text-[#285943]" />
          <span className="text-[#777D76]">Active Document:</span>
          <span className="font-medium text-[#285943] max-w-[240px] truncate">
            {docName}
          </span>
        </div>
      ) : (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#E4E5DE] bg-white px-3 py-1 text-xs font-medium text-[#777D76]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8DAA91]" />
          <span>{PRODUCT_CONFIG.category} Workspace</span>
        </div>
      )}

      {/* Main Editorial Headline */}
      <h1 className="font-serif text-3xl font-medium tracking-tight text-[#262B27] md:text-4xl">
        What would you like to discover?
      </h1>

      {/* Supporting Text */}
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#777D76]">
        Ask questions, investigate complex documents, and uncover the information that matters.
      </p>

      {/* Contextual Suggested Prompt Cards */}
      <div className="mt-8 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 text-left">
        {EXAMPLE_PROMPTS.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => onPick(item.prompt)}
            className="group flex flex-col justify-between rounded-xl border border-[#E4E5DE] bg-white p-3.5 text-left transition hover:border-[#8DAA91] hover:bg-[#FDFBF7] hover:shadow-xs active:scale-[0.99]"
          >
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-[#262B27] group-hover:text-[#285943]">
                <span>{item.title}</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#D0D2C7] transition group-hover:translate-x-0.5 group-hover:text-[#285943]" />
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[#777D76]">
                {item.desc}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
