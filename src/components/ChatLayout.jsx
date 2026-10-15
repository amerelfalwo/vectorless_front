import { PanelLeftOpen } from 'lucide-react'

/**
 * @param {{
 *   sidebar: import('react').ReactNode
 *   children: import('react').ReactNode
 *   structureExplorer?: import('react').ReactNode
 *   mobileSidebarOpen: boolean
 *   onMobileSidebarOpenChange: (open: boolean) => void
 *   sidebarCollapsed: boolean
 *   onSidebarCollapsedChange?: (collapsed: boolean) => void
 * }} props
 */
export function ChatLayout({
  sidebar,
  children,
  structureExplorer = null,
  mobileSidebarOpen,
  onMobileSidebarOpenChange,
  sidebarCollapsed,
  onSidebarCollapsedChange,
}) {
  return (
    <div className="relative flex h-dvh w-full min-h-0 overflow-hidden bg-[#F7F6F1] text-[#262B27]">
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs transition-opacity md:hidden"
          onClick={() => onMobileSidebarOpenChange(false)}
        />
      ) : null}

      {/* Persistent Navigation Sidebar (Desktop collapsible & Mobile overlay) */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col bg-white transition-all duration-300 ease-in-out md:static md:z-20 overflow-hidden',
          sidebarCollapsed
            ? 'w-0 md:w-0 opacity-0 pointer-events-none'
            : 'w-[290px] md:w-[290px] opacity-100',
          mobileSidebarOpen
            ? 'translate-x-0 w-[290px] shadow-2xl opacity-100 pointer-events-auto'
            : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <div className="w-[290px] h-full flex flex-col overflow-hidden">
          {sidebar}
        </div>
      </aside>

      {/* Main Workspace Column */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#F7F6F1]">
        {/* Floating Toggle Button to re-open sidebar when collapsed */}
        <div
          className={`absolute top-3 left-3 z-30 ${
            !sidebarCollapsed ? 'flex md:hidden' : 'flex'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 768) {
                onMobileSidebarOpenChange(true)
              } else {
                onSidebarCollapsedChange?.(false)
              }
            }}
            title="Open sidebar"
            className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-[#E4E5DE] bg-white text-[#262B27] shadow-sm hover:bg-[#F7F6F1] hover:text-[#285943] transition"
          >
            <PanelLeftOpen className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Workspace Body (Chat, Document Library, or Knowledge Memory) */}
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden relative">
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {children}
          </main>

          {/* Side Document Structure Explorer Drawer */}
          {structureExplorer}
        </div>
      </div>
    </div>
  )
}
