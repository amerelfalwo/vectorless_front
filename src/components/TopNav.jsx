import { memo } from 'react'
import {
  Menu,
  FileText,
  X,
  FolderTree,
} from 'lucide-react'
import { PRODUCT_CONFIG } from '../config/product.js'

/**
 * Top Navigation Bar
 */
export const TopNav = memo(function TopNav({
  title = 'Research Workspace',
  activeDocId = null,
  activeDocName = null,
  onDetachDoc,
  onToggleStructureExplorer,
  structureExplorerOpen = false,
  onOpenMobileSidebar,
  currentView = 'chat', // 'chat' | 'documents'
}) {

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
            {currentView === 'documents' ? 'Library' : 'Research'}
          </span>
          <span className="text-xs text-[#D0D2C7] hidden sm:inline">/</span>
          <h1 className="truncate text-sm font-medium text-[#262B27] max-w-[180px] sm:max-w-xs md:max-w-md">
            {title}
          </h1>
        </div>
      </div>

      {/* Middle/Right: Active Document Context Pill & Actions */}
      <div className="flex items-center gap-2.5">
        {activeDocId && currentView === 'chat' ? (
          <div className="flex items-center gap-1.5 rounded-full border border-[#E4E5DE] bg-[#F7F6F1] pl-2.5 pr-1 py-1 text-xs shadow-2xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <FileText className="h-3.5 w-3.5 shrink-0 text-[#285943]" aria-hidden />
              <span className="max-w-[120px] md:max-w-[200px] truncate font-medium text-[#262B27]">
                {activeDocName || 'PDF Document'}
              </span>
            </div>

            {/* Structure Explorer Toggle Button */}
            {onToggleStructureExplorer && (
              <button
                type="button"
                onClick={onToggleStructureExplorer}
                title={structureExplorerOpen ? 'Hide document structure' : 'Explore document structure'}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                  structureExplorerOpen
                    ? 'bg-[#285943] text-white'
                    : 'text-[#285943] hover:bg-[#E8F0E8]'
                }`}
              >
                <FolderTree className="h-3 w-3" />
                <span className="hidden lg:inline">Structure</span>
              </button>
            )}

            {/* Detach Document Button */}
            {onDetachDoc && (
              <button
                type="button"
                onClick={onDetachDoc}
                title="Detach document from this chat session"
                className="rounded-full p-1 text-[#777D76] transition hover:bg-white hover:text-red-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : null}

        {/* Secondary Technical Status Area */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[#E4E5DE] bg-[#F7F6F1] px-2.5 py-1 text-[11px] text-[#777D76]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8DAA91]" />
          <span>{PRODUCT_CONFIG.technology}</span>
        </div>
      </div>
    </header>
  )
})
