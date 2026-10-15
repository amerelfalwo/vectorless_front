import { memo, useState, useRef, useEffect } from 'react'
import {
  Menu,
  FileText,
  X,
  FolderTree,
  Plus,
  Brain,
  Layers,
  ChevronDown,
} from 'lucide-react'
import { PRODUCT_CONFIG } from '../config/product.js'

/**
 * Enhanced Top Navigation Bar with Multi-Document Attachment & Knowledge Base access
 */
export const TopNav = memo(function TopNav({
  title = 'Research Workspace',
  attachedDocs = [],
  availableDocs = [],
  onAttachDoc,
  onDetachDoc,
  onToggleStructureExplorer,
  structureExplorerOpen = false,
  onOpenMobileSidebar,
  currentView = 'chat', // 'chat' | 'documents' | 'knowledge'
  onNavigate,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter available docs to those not already attached
  const unattachedDocs = availableDocs.filter(
    (d) => !attachedDocs.some((ad) => ad.doc_id === d.doc_id)
  )

  const viewTitles = {
    chat: 'Research',
    documents: 'Library',
    knowledge: 'Knowledge Base',
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#E4E5DE] bg-white px-4 md:px-6">
      {/* Left: Mobile hamburger & current breadcrumb / title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open sidebar navigation"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#777D76] transition hover:bg-[#F7F6F1] hover:text-[#262B27] md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#777D76] hidden sm:inline">
            {viewTitles[currentView] || 'Research'}
          </span>
          <span className="text-xs text-[#D0D2C7] hidden sm:inline">/</span>
          <h1 className="truncate text-sm font-medium text-[#262B27] max-w-[160px] sm:max-w-xs md:max-w-md">
            {title}
          </h1>
        </div>
      </div>

      {/* Middle/Right: Multi-Document Chips & Attach Control */}
      <div className="flex items-center gap-2 min-w-0">
        {currentView === 'chat' && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-[280px] sm:max-w-[420px] md:max-w-[580px] scrollbar-none">
            {/* Render attached document chips */}
            {attachedDocs.map((doc) => (
              <div
                key={doc.doc_id}
                className="flex items-center gap-1.5 rounded-full border border-[#E4E5DE] bg-[#F7F6F1] pl-2.5 pr-1 py-1 text-xs shadow-2xs shrink-0"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-[#285943]" aria-hidden />
                <span className="max-w-[100px] sm:max-w-[140px] truncate font-medium text-[#262B27]">
                  {doc.filename || 'Document'}
                </span>

                {onDetachDoc && (
                  <button
                    type="button"
                    onClick={() => onDetachDoc(doc.doc_id)}
                    title={`Detach ${doc.filename} from session`}
                    className="rounded-full p-1 text-[#777D76] transition hover:bg-white hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}

            {/* "+ Attach Document" Dropdown */}
            {onAttachDoc && unattachedDocs.length > 0 && (
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1 rounded-full border border-dashed border-[#8DAA91] bg-white px-2.5 py-1 text-xs font-medium text-[#285943] transition hover:bg-[#E8F0E8]"
                  title="Attach another document to this research session"
                >
                  <Plus className="h-3 w-3" />
                  <span className="hidden sm:inline">Attach</span>
                  <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#E4E5DE] bg-white py-1.5 shadow-lg z-50">
                    <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#777D76] border-b border-[#E4E5DE]/60">
                      Attach from Library
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {unattachedDocs.map((d) => (
                        <button
                          key={d.doc_id}
                          type="button"
                          onClick={() => {
                            onAttachDoc(d)
                            setDropdownOpen(false)
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs text-[#262B27] hover:bg-[#F7F6F1] transition"
                        >
                          <FileText className="h-3.5 w-3.5 text-[#285943] shrink-0" />
                          <span className="truncate flex-1 font-medium">{d.filename}</span>
                          <span className="text-[10px] text-[#777D76]">
                            {d.page_count ? `${d.page_count}p` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Structure Explorer Toggle Button */}
            {onToggleStructureExplorer && attachedDocs.length > 0 && (
              <button
                type="button"
                onClick={onToggleStructureExplorer}
                title={structureExplorerOpen ? 'Hide document structure' : 'Explore document structure'}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition shrink-0 ${
                  structureExplorerOpen
                    ? 'bg-[#285943] text-white'
                    : 'text-[#285943] bg-[#E8F0E8] hover:bg-[#285943] hover:text-white'
                }`}
              >
                <FolderTree className="h-3 w-3" />
                <span className="hidden md:inline">Structure</span>
              </button>
            )}
          </div>
        )}

        {/* Knowledge Memory Shortcut */}
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('knowledge')}
            title="Open Global Knowledge Memory"
            className={`hidden sm:flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
              currentView === 'knowledge'
                ? 'border-[#285943] bg-[#285943] text-white'
                : 'border-[#E4E5DE] bg-white text-[#262B27] hover:bg-[#F7F6F1]'
            }`}
          >
            <Brain className="h-3.5 w-3.5 text-[#8DAA91]" />
            <span className="hidden md:inline">Knowledge</span>
          </button>
        )}

        {/* Technology Pill */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-lg border border-[#E4E5DE] bg-[#F7F6F1] px-2.5 py-1 text-[11px] text-[#777D76]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8DAA91]" />
          <span>{PRODUCT_CONFIG.technology}</span>
        </div>
      </div>
    </header>
  )
})
