import { useState } from 'react'
import {
  SquarePen,
  Search,
  MessageSquare,
  Menu,
} from 'lucide-react'
import { VectorlessLogo } from './VectorlessLogo.jsx'

/**
 * @param {{
 *   sidebar: import('react').ReactNode
 *   children: import('react').ReactNode
 *   mobileSidebarOpen: boolean
 *   onMobileSidebarOpenChange: (open: boolean) => void
 *   onNewChat: () => void
 * }} props
 */
export function ChatLayout({
  sidebar,
  children,
  mobileSidebarOpen,
  onMobileSidebarOpenChange,
  onNewChat,
}) {
  // Sidebar is open by default on desktop
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleSearchClick = () => {
    if (!sidebarOpen) setSidebarOpen(true)
    setTimeout(() => {
      document.getElementById('sidebar-search-input')?.focus()
    }, 100)
  }

  return (
    <div className="relative flex h-dvh w-full min-h-0 overflow-hidden bg-[#212121] text-[#ececec]">
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity md:hidden"
          onClick={() => onMobileSidebarOpenChange(false)}
        />
      ) : null}

      {/* 1. Left Icon Rail (Clean, no bottom icons, only functional tools) */}
      <aside
        className={`hidden md:flex w-[52px] shrink-0 flex-col items-center border-r border-white/5 bg-[#171717] py-3 z-30 select-none transition-all ${
          sidebarOpen ? 'border-r-0' : 'border-r border-white/5'
        }`}
      >
        {/* Rail Icons */}
        <div className="flex flex-col items-center gap-2.5">
          {/* Brand Logo - clicks to start new chat */}
          <button
            type="button"
            onClick={onNewChat}
            title="Vectorless RAG"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/10 active:scale-95"
          >
            <VectorlessLogo className="h-6 w-6" />
          </button>

          {/* New Chat Icon */}
          <button
            type="button"
            onClick={() => {
              onNewChat()
              if (!sidebarOpen) setSidebarOpen(true)
            }}
            title="New chat"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            <SquarePen className="h-5 w-5" />
          </button>

          {/* Search Icon - opens sidebar and focuses search */}
          <button
            type="button"
            onClick={handleSearchClick}
            title="Search chats"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Toggle Sidebar Drawer Button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition active:scale-95 ${
              sidebarOpen
                ? 'bg-white/10 text-white'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* 2. Slide-out Sessions Drawer (Desktop collapsible & Mobile overlay) */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col bg-[#171717] shadow-2xl transition-all duration-300 ease-in-out md:static md:z-20 md:shadow-none overflow-hidden',
          sidebarOpen
            ? 'w-[260px] md:w-[260px] opacity-100 border-r border-white/5'
            : 'w-0 md:w-0 opacity-0 pointer-events-none border-r-0',
          mobileSidebarOpen
            ? 'translate-x-0 w-[280px] opacity-100 pointer-events-auto'
            : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <div className="w-[260px] h-full flex flex-col overflow-hidden">
          {sidebar}
        </div>
      </div>

      {/* 3. Main Center View */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#212121]">
        {/* Top Header: Only displayed on mobile for the hamburger drawer menu button */}
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center px-4 md:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            onClick={() => onMobileSidebarOpenChange(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
