import { Menu, X } from 'lucide-react'

/**
 * @param {{
 *   sidebar: import('react').ReactNode
 *   children: import('react').ReactNode
 *   mobileSidebarOpen: boolean
 *   onMobileSidebarOpenChange: (open: boolean) => void
 * }} props
 */
export function ChatLayout({
  sidebar,
  children,
  mobileSidebarOpen,
  onMobileSidebarOpenChange,
}) {
  return (
    <div className="relative flex h-dvh w-full min-h-0 overflow-hidden bg-zinc-950 text-zinc-100">
      {mobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 md:hidden"
          onClick={() => onMobileSidebarOpenChange(false)}
        />
      ) : null}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] shrink-0 flex-col border-r border-zinc-800/90 bg-zinc-900 shadow-xl shadow-black/40 md:static md:z-0 md:w-72 md:translate-x-0 md:shadow-none',
          'transition-transform duration-300 ease-out motion-reduce:transition-none',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:ml-0">
        <header className="sticky top-0 z-30 flex shrink-0 items-center gap-2 border-b border-zinc-800/80 bg-zinc-950/90 px-3 py-2.5 backdrop-blur-md md:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-300 transition hover:bg-zinc-800 hover:text-white active:scale-95"
            onClick={() => onMobileSidebarOpenChange(true)}
            aria-label="Open menu"
            aria-expanded={mobileSidebarOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-zinc-200">Vectorless RAG</span>
          {mobileSidebarOpen ? (
            <button
              type="button"
              className="ml-auto rounded-lg p-2 text-zinc-300 transition hover:bg-zinc-800"
              onClick={() => onMobileSidebarOpenChange(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </header>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}
