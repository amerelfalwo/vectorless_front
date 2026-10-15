import { memo, useMemo, useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Sparkles,
  FolderTree,
} from 'lucide-react'


/**
 * Recursive tree node item
 */
const TreeNode = memo(function TreeNode({
  node,
  depth = 0,
  activeNodeId,
  onSelectNode,
  onAskSection,
  searchQuery,
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const [showPreview, setShowPreview] = useState(false)

  const title = node.title || node.name || '(Untitled Section)'
  const page = node.page_index ?? node.page ?? null
  const nodeId = node.node_id ?? node.id ?? null
  const children = Array.isArray(node.nodes) ? node.nodes : []
  const hasChildren = children.length > 0
  const summary = node.summary || (node.text ? node.text.slice(0, 200) + '...' : null)

  const isSelected = activeNodeId && activeNodeId === nodeId
  const matchesSearch =
    searchQuery &&
    title.toLowerCase().includes(searchQuery.toLowerCase())

  return (
    <div className="flex flex-col select-none">
      <div
        className={`group flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
          isSelected || matchesSearch
            ? 'bg-[#E8F0E8] text-[#285943] font-medium'
            : 'text-[#262B27] hover:bg-[#F7F6F1]'
        }`}
        style={{ paddingLeft: `${Math.max(10, depth * 16 + 10)}px` }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? 'Collapse section' : 'Expand section'}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[#777D76] hover:bg-black/5 hover:text-[#262B27]"
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[#8DAA91]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8DAA91]" />
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              onSelectNode?.(node)
              setShowPreview(!showPreview)
            }}
            className="min-w-0 flex-1 text-left truncate hover:underline hover:text-[#285943]"
            title={title}
          >
            {title}
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {page != null && page !== '?' && (
            <span className="rounded bg-white border border-[#E4E5DE] px-1.5 py-0.2 font-mono text-[10px] text-[#777D76]">
              p.{page}
            </span>
          )}

          {onAskSection && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onAskSection(node)
              }}
              title="Ask question about this section"
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center gap-1 rounded border border-[#E4E5DE] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#285943] transition hover:bg-[#E8F0E8]"
            >
              <Sparkles className="h-2.5 w-2.5 text-[#285943]" />
              Inquire
            </button>
          )}
        </div>
      </div>

      {/* Expanded node text preview */}
      {showPreview && summary ? (
        <div
          className="mx-3 my-1 rounded-md border border-[#E4E5DE] bg-[#FFFFFF] p-2 text-[11px] leading-relaxed text-[#555B54] shadow-xs"
          style={{ marginLeft: `${Math.max(24, depth * 16 + 24)}px` }}
        >
          <div className="flex items-center justify-between pb-1 font-mono text-[9px] text-[#777D76]">
            <span>NODE #{nodeId || 'section'}</span>
            {page != null && <span>PAGE {page}</span>}
          </div>
          <p>{summary}</p>
        </div>
      ) : null}

      {/* Child nodes */}
      {hasChildren && expanded ? (
        <div className="flex flex-col">
          {children.map((child, idx) => (
            <TreeNode
              key={child.node_id || `${title}-${idx}`}
              node={child}
              depth={depth + 1}
              activeNodeId={activeNodeId}
              onSelectNode={onSelectNode}
              onAskSection={onAskSection}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
})

/**
 * Document Structure Explorer Panel
 */
export function DocumentStructureExplorer({
  tree = [],
  docName = 'Document',
  activeNodeId = null,
  onClose,
  onSelectNode,
  onAskSection,
}) {

  const [search, setSearch] = useState('')

  // Flatten nodes count
  const stats = useMemo(() => {
    let count = 0
    let maxDepth = 0
    function countNodes(nodes, depth = 1) {
      if (!Array.isArray(nodes)) return
      maxDepth = Math.max(maxDepth, depth)
      for (const n of nodes) {
        count++
        if (n.nodes) countNodes(n.nodes, depth + 1)
      }
    }
    countNodes(tree)
    return { count, maxDepth }
  }, [tree])

  return (
    <aside
      className="flex h-full w-[340px] md:w-[380px] shrink-0 flex-col border-l border-[#E4E5DE] bg-white text-[#262B27] shadow-lg md:shadow-none animate-slideLeft z-30"
      aria-label="Document Tree Structure"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E4E5DE] px-4 py-3 bg-[#F7F6F1]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F0E8] text-[#285943]">
            <FolderTree className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#262B27]">
              Document Structure
            </h2>
            <p className="truncate text-[11px] text-[#777D76]" title={docName}>
              {docName}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          title="Close structure explorer"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#777D76] transition hover:bg-white hover:text-[#262B27]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Overview Metadata Bar */}
      <div className="flex items-center justify-between border-b border-[#E4E5DE] px-4 py-2 text-[11px] text-[#777D76] bg-white">
        <span>{stats.count} indexed sections</span>
        <span className="font-mono text-[10px] bg-[#F7F6F1] px-1.5 py-0.5 rounded border border-[#E4E5DE]">
          {stats.maxDepth} hierarchy levels
        </span>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-[#E4E5DE] bg-white">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#777D76]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search outline & sections..."
            className="w-full rounded-lg border border-[#E4E5DE] bg-[#F7F6F1] pl-8 pr-3 py-1.5 text-xs text-[#262B27] placeholder:text-[#777D76] focus:border-[#285943] focus:bg-white focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-[#777D76] hover:text-[#262B27]"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Tree Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-thin">
        {!tree || tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-[#777D76]">
            <FolderTree className="h-8 w-8 text-[#D0D2C7] mb-2" />
            <p className="font-medium text-[#262B27]">No tree index available</p>
            <p className="mt-1">
              Document indexing is in progress or no document is attached.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {tree.map((node, idx) => (
              <TreeNode
                key={node.node_id || `root-${idx}`}
                node={node}
                depth={0}
                activeNodeId={activeNodeId}
                onSelectNode={onSelectNode}
                onAskSection={onAskSection}
                searchQuery={search}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-[#E4E5DE] bg-[#F7F6F1] px-4 py-2.5 text-[11px] text-[#777D76]">
        <div className="flex items-center justify-between">
          <span>Vectorless RAG Tree Retrieval</span>
          <span className="font-medium text-[#285943]">Deterministic</span>
        </div>
      </div>
    </aside>
  )
}
