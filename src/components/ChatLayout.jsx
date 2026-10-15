/**
 * @param {{
 *   sidebar: import('react').ReactNode
 *   topNav: import('react').ReactNode
 *   children: import('react').ReactNode
 *   structureExplorer?: import('react').ReactNode
 *   mobileSidebarOpen: boolean
 *   onMobileSidebarOpenChange: (open: boolean) => void
 *   sidebarCollapsed: boolean
 * }} props
 */
export function ChatLayout({
  sidebar,
  topNav,
  children,
  structureExplorer = null,
  mobileSidebarOpen,
  onMobileSidebarOpenChange,
  sidebarCollapsed,
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
            : 'w-[280px] md:w-[280px] opacity-100',
          mobileSidebarOpen
            ? 'translate-x-0 w-[280px] shadow-2xl opacity-100 pointer-events-auto'
            : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <div className="w-[280px] h-full flex flex-col overflow-hidden">
          {sidebar}
        </div>
      </aside>

      {/* Main Workspace Column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#F7F6F1]">
        {/* Top Navigation Bar */}
        {topNav}

        {/* Workspace Body (Chat or Document Library) + Optional Side Structure Explorer */}
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
